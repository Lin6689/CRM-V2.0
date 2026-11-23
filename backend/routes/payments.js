const express = require("express");
const Payment = require("../models/Payment");
const Invoice = require("../models/Invoice");
const Customer = require("../models/Customer");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();
router.use(authMiddleware);
router.use((req, res, next) => { req.bizId = req.user.businessId || req.bizId; next(); });

// POST /api/payments — partial/full payment record karo
router.post("/", async (req, res) => {
  const session = await Payment.startSession();
  try {
    session.startTransaction();

    const { invoiceId, amount, paymentMethod, notes, paymentDate } = req.body;
    const amt = Number(amount);
    if (!invoiceId || !amt || amt <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: "invoiceId and valid amount required" });
    }
    if (!["Cash", "UPI", "Bank Transfer", "Card"].includes(paymentMethod)) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Invalid payment method" });
    }

    const invoice = await Invoice.findOne({ _id: invoiceId, owner: req.bizId }).session(session);
    if (!invoice) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Invoice not found" });
    }
    if (invoice.status === "Cancelled" || invoice.status === "Paid") {
      await session.abortTransaction();
      return res.status(400).json({ message: `Invoice is ${invoice.status}` });
    }

    const balanceDue = (invoice.balanceDue ?? invoice.grandTotal - (invoice.amountPaid || 0));
    if (amt > balanceDue) {
      await session.abortTransaction();
      return res.status(400).json({ message: `Amount exceeds balance due (₹${balanceDue})` });
    }

    const payment = await Payment.create(
      [{
        customerId: invoice.customerId,
        invoiceId: invoice._id,
        amount: amt,
        paymentMethod,
        paymentDate: paymentDate || new Date(),
        notes: notes || "",
        owner: req.bizId,
      }],
      { session }
    );

    // Invoice update: amountPaid, balanceDue, status
    const newPaid = (invoice.amountPaid || 0) + amt;
    const newDue = invoice.grandTotal - newPaid;
    const newStatus = newDue <= 0 ? "Paid" : newPaid > 0 ? "Partial" : invoice.status;

    await Invoice.updateOne(
      { _id: invoice._id },
      { amountPaid: newPaid, balanceDue: newDue, status: newStatus },
      { session }
    );

    // Customer udhaar kam hota hai payment se
    await Customer.updateOne(
      { _id: invoice.customerId },
      { $inc: { currentBalance: -amt } },
      { session }
    );

    await session.commitTransaction();
    res.status(201).json(payment[0]);
  } catch (err) {
    await session.abortTransaction().catch(() => {});
    res.status(500).json({ message: err.message || "Server error" });
  } finally {
    session.endSession();
  }
});

module.exports = router;
