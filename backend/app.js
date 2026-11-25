require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");

const authRoutes = require("./routes/auth");
const customerRoutes = require("./routes/customers");
const productRoutes = require("./routes/products");
const invoiceRoutes = require("./routes/invoices");
const paymentRoutes = require("./routes/payments");
const analyticsRoutes = require("./routes/analytics");
const userRoutes = require("./routes/users");

const app = express();

// Security hardening
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(cors({ origin: process.env.FRONTEND_URL || true }));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));

// Rate limiting on auth routes (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { message: "Too many attempts, try again later" },
});
app.use("/api/auth", authLimiter, authRoutes);

const MD_DBR =
  process.env.MONGODB_URI ||
  "mongodb+srv://dhavalll852004_db_user:HAy6x0lelQWI4WvP@cluster0.1okxzjw.mongodb.net/CRM";
mongoose
  .connect(MD_DBR)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

app.use("/api/customers", customerRoutes);
app.use("/api/products", productRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/users", userRoutes);

module.exports = app;
