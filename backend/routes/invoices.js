const express = require("express");
const mongoose = require("mongoose");
const PDFDocument = require("pdfkit");
const nodemailer = require("nodemailer");
const User = require("../models/User");
const Invoice = require("../models/Invoice");
const Customer = require("../models/Customer");
const Product = require("../models/Product");
const { authMiddleware, authorizeRoles } = require("../middleware/auth");

const router = express.Router();
router.use(authMiddleware);
router.use((req, res, next) => { req.bizId = req.user.businessId || req.bizId; next(); });

// Helper: invoice ka effective status (dueDate guzar gayi + unpaid = Overdue)
function effectiveStatus(inv) {
  if (inv.status === "Cancelled" || inv.status === "Paid") return inv.status;
  if (inv.dueDate && new Date(inv.dueDate) < new Date()) return "Overdue";
  return inv.status;
}

// GET /api/invoices — pagination + search + filters
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", status = "", startDate = "", endDate = "", sortBy = "createdAt" } = req.query;
    const filter = { owner: req.bizId };
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate + "T23:59:59");
    }
    if (search) {
      filter.$or = [
        { customerName: { $regex: search, $options: "i" } },
        { "items.productName": { $regex: search, $options: "i" } },
      ];
    }

    const sortMap = { total: { grandTotal: -1 }, oldest: { createdAt: 1 }, customer: { customerName: 1 } };
    const sort = sortMap[sortBy] || { createdAt: -1 };
    const skip = (Number(page) - 1) * Number(limit);
    const [invoices, total] = await Promise.all([
      Invoice.find(filter).sort(sort).skip(skip).limit(Number(limit)),
      Invoice.countDocuments(filter),
    ]);

    res.json({
      items: invoices.map((i) => ({ ...i.toObject(), status: effectiveStatus(i) })),
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/invoices — create (staff + admin dono)
router.post("/", async (req, res) => {
  try {
    const { customerId, taxRate = 0, status = "Pending", dueDate, items } = req.body;

    if (!customerId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "customerId and items are required" });
    }

    const customer = await Customer.findOne({ _id: customerId, owner: req.bizId });
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    const invoiceItems = [];
    for (const item of items) {
      const product = await Product.findOne({ _id: item.productId, owner: req.bizId });
      if (!product) return res.status(404).json({ message: "Product not found" });
      if (product.stockQuantity < item.quantity) {
        return res.status(400).json({ message: `Not enough stock for ${product.productName}` });
      }
      invoiceItems.push({
        productId: product._id,
        productName: product.productName,
        quantity: Number(item.quantity),
        unitPrice: product.price,
      });
    }

    const subtotal = invoiceItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const taxAmount = (subtotal * Number(taxRate)) / 100;
    const grandTotal = subtotal + taxAmount;
    const finalStatus = status === "Paid" ? "Paid" : "Pending";

    for (const item of invoiceItems) {
      await Product.updateOne(
        { _id: item.productId, owner: req.bizId },
        { $inc: { stockQuantity: -item.quantity } }
      );
    }

    const invoice = await Invoice.create({
      customerId: customer._id,
      customerName: customer.name,
      items: invoiceItems,
      subtotal,
      taxRate: Number(taxRate),
      taxAmount,
      grandTotal,
      amountPaid: finalStatus === "Paid" ? grandTotal : 0,
      balanceDue: finalStatus === "Paid" ? 0 : grandTotal,
      dueDate: dueDate || null,
      status: finalStatus,
      owner: req.bizId,
    });

    if (finalStatus !== "Paid") {
      await Customer.updateOne({ _id: customer._id }, { $inc: { currentBalance: grandTotal } });
    }

    res.status(201).json({ ...invoice.toObject(), status: effectiveStatus(invoice) });
  } catch (err) {
    res.status(500).json({ message: err.message || "Server error" });
  }
});

// PATCH /api/invoices/:id/cancel — admin only, stock restore + balance fix
router.patch("/:id/cancel", authorizeRoles("admin"), async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const invoice = await Invoice.findOne({ _id: req.params.id, owner: req.bizId }).session(session);
    if (!invoice) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Invoice not found" });
    }
    if (invoice.status === "Cancelled") {
      await session.abortTransaction();
      return res.status(400).json({ message: "Invoice already cancelled" });
    }

    // Stock restore
    for (const item of invoice.items) {
      await Product.updateOne(
        { _id: item.productId, owner: req.bizId },
        { $inc: { stockQuantity: item.quantity } },
        { session }
      );
    }

    // Customer balance se outstanding amount minus karo
    const outstanding = invoice.balanceDue ?? (invoice.grandTotal - (invoice.amountPaid || 0));
    if (outstanding > 0) {
      await Customer.updateOne(
        { _id: invoice.customerId },
        { $inc: { currentBalance: -outstanding } },
        { session }
      );
    }

    await Invoice.updateOne({ _id: invoice._id }, { status: "Cancelled" }, { session });
    await session.commitTransaction();
    res.json({ message: "Invoice cancelled, stock restored" });
  } catch (err) {
    await session.abortTransaction().catch(() => {});
    res.status(500).json({ message: err.message || "Server error" });
  } finally {
    session.endSession();
  }
});

// GET /api/invoices/export — CSV export (date/status filters support)
router.get("/export", async (req, res) => {
  try {
    const { startDate = "", endDate = "", status = "" } = req.query;
    const filter = { owner: req.bizId };
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate + "T23:59:59");
    }

    const invoices = await Invoice.find(filter).sort({ createdAt: -1 });

    let csv = "InvoiceNo,Date,Customer,Items,Subtotal,Tax,GrandTotal,AmountPaid,BalanceDue,Status\n";
    for (const inv of invoices) {
      const items = inv.items.map((i) => `${i.productName} x${i.quantity}`).join("; ");
      csv += `"${inv._id}","${new Date(inv.createdAt).toLocaleDateString("en-IN")}","${inv.customerName}","${items}",${inv.subtotal},${inv.taxAmount},${inv.grandTotal},${inv.amountPaid || 0},${inv.balanceDue ?? inv.grandTotal - (inv.amountPaid || 0)},${effectiveStatus(inv)}\n`;
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=invoices.csv");
    res.send(csv);
  } catch {
    res.status(500).json({ message: "Export failed" });
  }
});


// POST /api/invoices/:id/send-email — PDF invoice customer ko email karo
router.post("/:id/send-email", async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, owner: req.bizId });
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    const customer = await Customer.findById(invoice.customerId);
    const toEmail = req.body.email || customer?.email;
    if (!toEmail) return res.status(400).json({ message: "Customer email not available" });
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return res.status(500).json({ message: "Email not configured (GMAIL_USER/GMAIL_APP_PASSWORD missing)" });
    }

    const owner = await User.findById(req.bizId);
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    const done = new Promise((r) => doc.on("end", r));

    doc.fontSize(20).font("Helvetica-Bold").text(owner?.businessName || "Mini CRM");
    if (owner?.address) doc.fontSize(10).font("Helvetica").text(owner.address);
    doc.moveDown();
    doc.fontSize(16).text("TAX INVOICE").fontSize(10)
      .text("Invoice #: " + invoice._id.toString().slice(-8).toUpperCase())
      .text("Date: " + new Date(invoice.createdAt).toLocaleDateString("en-IN"))
      .text("Bill To: " + invoice.customerName);
    doc.moveDown();
    let y = doc.y;
    doc.font("Helvetica-Bold").fontSize(10)
      .text("Item", 50, y).text("Qty", 300, y, { width: 50, align: "right" })
      .text("Price", 360, y, { width: 70, align: "right" })
      .text("Total", 440, y, { width: 80, align: "right" });
    doc.moveTo(50, y + 15).lineTo(520, y + 15).stroke();
    y += 22;
    doc.font("Helvetica");
    for (const item of invoice.items) {
      doc.text(item.productName, 50, y, { width: 240 })
        .text(String(item.quantity), 300, y, { width: 50, align: "right" })
        .text("Rs" + item.unitPrice, 360, y, { width: 70, align: "right" })
        .text("Rs" + item.quantity * item.unitPrice, 440, y, { width: 80, align: "right" });
      y += 20;
    }
    doc.font("Helvetica-Bold").fontSize(12)
      .text("Grand Total: Rs" + invoice.grandTotal, 360, y + 10, { align: "right" });
    doc.end();
    await done;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
    await transporter.sendMail({
      from: "\"" + (owner?.businessName || "Mini CRM") + "\" <" + process.env.GMAIL_USER + ">",
      to: toEmail,
      subject: "Invoice #" + invoice._id.toString().slice(-8).toUpperCase(),
      text: "Please find attached your invoice. Total: Rs" + invoice.grandTotal,
      attachments: [{ filename: "invoice-" + invoice._id + ".pdf", content: Buffer.concat(chunks) }],
    });
    res.json({ message: "Invoice emailed to " + toEmail });
  } catch (err) {
    res.status(500).json({ message: err.message || "Email send failed" });
  }
});

module.exports = router;
