const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { authMiddleware, authorizeRoles } = require("../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

const publicUser = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  businessName: u.businessName,
  role: u.role,
  disabled: u.disabled,
  businessId: u.businessId,
  createdAt: u.createdAt,
});

// Admin: saare users list karo
router.get("/", async (req, res) => {
  try {
    const filter = req.user.role === "superadmin" ? {} : { businessId: req.user.businessId || req.user.id };
    const users = await User.find(filter).sort({ createdAt: -1 });
    res.json(users.map(publicUser));
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Admin: staff account banao
router.post("/", authorizeRoles("admin"), async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email, password required" });
    }
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ message: "Email already registered" });

    const admin = await User.findById(req.user.id);
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name, email, passwordHash,
      businessName: admin.businessName,
      address: admin.address || "",
      role: "staff", createdBy: req.user.id, businessId: req.user.businessId || req.user.id,
    });
    res.status(201).json(publicUser(user));
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Admin: staff disable/enable karo
router.patch("/:id", authorizeRoles("admin"), async (req, res) => {
  try {
    const { disabled } = req.body;
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: "Apna account disable nahi kar sakte" });
    }
    const target = await User.findOne({ _id: req.params.id, businessId: req.user.businessId || req.user.id });
    if (!target) return res.status(404).json({ message: "User not found" });
    const user = await User.findByIdAndUpdate(req.params.id, { disabled: !!disabled }, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(publicUser(user));
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
