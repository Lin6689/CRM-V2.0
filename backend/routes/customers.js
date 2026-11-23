const express = require("express");
const Customer = require("../models/Customer");
const Invoice = require("../models/Invoice");
const Payment = require("../models/Payment");
const { authMiddleware, authorizeRoles } = require("../middleware/auth");

const router = express.Router();
router.use(authMiddleware);
router.use((req, res, next) => { req.bizId = req.user.businessId || req.bizId; next(); });

// GET /api/customers — pagination + search
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", sortBy = "createdAt", startDate = "", endDate = "" } = req.query;
    const filter = { owner: req.bizId };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate + "T23:59:59");
    }
    const sortMap = { name: { name: 1 }, phone: { phone: 1 }, currentBalance: { currentBalance: -1 }, oldest: { createdAt: 1 } };
    const sort = sortMap[sortBy] || { createdAt: -1 };
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Customer.find(filter).sort(sort).skip(skip).limit(Number(limit)),
      Customer.countDocuments(filter),
    ]);
    res.json({ items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/customers — staff + admin dono add kar sakte hain
router.post("/", async (req, res) => {
  try {
    const { name, phone, email, address, currentBalance } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ message: "Name and phone are required" });
    }
    const duplicate = await Customer.findOne({ phone, owner: req.bizId });
    if (duplicate) {
      return res.status(400).json({ message: "Phone number already exists" });
    }
    const customer = await Customer.create({
      name,
      phone,
      email: email || "",
      address: address || "",
      currentBalance: Number(currentBalance) || 0,
      owner: req.bizId,
    });
    res.status(201).json(customer);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/customers/:id — staff edit nahi kar sakta (sirf view/add), admin edit kare
router.put("/:id", authorizeRoles("admin"), async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.owner;

    if (updates.phone) {
      const duplicate = await Customer.findOne({
        phone: updates.phone,
        owner: req.bizId,
        _id: { $ne: req.params.id },
      });
      if (duplicate) {
        return res.status(400).json({ message: "Phone number already exists" });
      }
    }

    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, owner: req.bizId },
      updates,
      { new: true, runValidators: true }
    );
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.json(customer);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/customers/:id — admin only
router.delete("/:id", authorizeRoles("admin"), async (req, res) => {
  try {
    const customer = await Customer.findOneAndDelete({ _id: req.params.id, owner: req.bizId });
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.json({ message: "Customer deleted" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/customers/export — CSV export
router.get("/export", async (req, res) => {
  try {
    const customers = await Customer.find({ owner: req.bizId }).sort({ createdAt: -1 });
    let csv = "Name,Phone,Email,Address,CurrentBalance,CreatedAt\n";
    for (const c of customers) {
      csv += `"${c.name}","${c.phone}","${c.email}","${c.address}",${c.currentBalance},"${new Date(c.createdAt).toLocaleDateString("en-IN")}"\n`;
    }
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=customers.csv");
    res.send(csv);
  } catch {
    res.status(500).json({ message: "Export failed" });
  }
});



// GET /api/customers/:id/ledger — customer ka poora statement (invoices + payments)
router.get("/:id/ledger", async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, owner: req.bizId });
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    const [invoices, payments] = await Promise.all([
      Invoice.find({ customerId: customer._id, owner: req.bizId }).sort({ createdAt: 1 }),
      Payment.find({ customerId: customer._id, owner: req.bizId }).sort({ createdAt: 1 }),
    ]);
    res.json({ customer, invoices, payments });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
