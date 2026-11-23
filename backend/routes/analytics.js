const express = require("express");
const mongoose = require("mongoose");
const Invoice = require("../models/Invoice");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const { authMiddleware, authorizeRoles } = require("../middleware/auth");

const router = express.Router();
router.use(authMiddleware, authorizeRoles("admin"));
router.use((req, res, next) => { req.bizId = req.user.businessId || req.user.id; next(); });

// GET /api/analytics/summary — aggregation pipelines se live stats
router.get("/summary", async (req, res) => {
  try {
    const owner = new mongoose.Types.ObjectId(req.bizId);
    const live = { owner, status: { $ne: "Cancelled" } };

    const [revenue, pending, count, customers, lowStock] = await Promise.all([
      Invoice.aggregate([
        { $match: { ...live, status: { $in: ["Paid", "Partial"] } } },
        { $group: { _id: null, total: { $sum: "$grandTotal" } } },
      ]),
      Invoice.aggregate([
        { $match: { ...live, status: { $in: ["Pending", "Partial", "Overdue"] } } },
        { $group: { _id: null, total: { $sum: "$balanceDue" } } },
      ]),
      Invoice.countDocuments(live),
      Customer.countDocuments({ owner }),
      Product.find({ owner, stockQuantity: { $lte: 10 } })
        .select("productName stockQuantity")
        .sort({ stockQuantity: 1 })
        .limit(10),
    ]);

    // Monthly sales trend — pichle 6 mahine
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthly = await Invoice.aggregate([
      { $match: { ...live, createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          revenue: { $sum: "$grandTotal" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Top 5 products — quantity aur revenue dono se
    const topProducts = await Invoice.aggregate([
      { $match: live },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productName",
          quantity: { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.quantity", "$items.unitPrice"] } },
        },
      },
      { $sort: { quantity: -1 } },
      { $limit: 5 },
    ]);

    res.json({
      totalRevenue: revenue[0]?.total || 0,
      totalPendingReceivables: pending[0]?.total || 0,
      totalInvoices: count,
      activeCustomers: customers,
      monthlySales: monthly,
      topProducts,
      lowStockAlerts: lowStock,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Server error" });
  }
});

module.exports = router;
