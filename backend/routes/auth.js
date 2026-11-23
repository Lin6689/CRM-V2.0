const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { signToken, authMiddleware } = require("../middleware/auth");

const router = express.Router();

const publicUser = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  businessName: u.businessName,
  address: u.address,
  role: u.role,
  businessId: u.businessId || u._id,
});

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, businessName, address } = req.body;
    if (!name || !email || !password || !businessName || !address) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ message: "Email already registered" });

    // Pehla user admin banta hai, baaki staff
    
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name, email, passwordHash, businessName, address,
      role: "admin",
    });
    user.businessId = user._id;
    await user.save();
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || "").toLowerCase() });
    if (!user) return res.status(401).json({ message: "Invalid email or password" });
    if (user.disabled) return res.status(403).json({ message: "Account is disabled" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid email or password" });

    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Update shop details (businessName, address)
router.put("/me", authMiddleware, async (req, res) => {
  try {
    const { businessName, address } = req.body;
    if (!businessName || !address) {
      return res.status(400).json({ message: "Business name and address are required" });
    }
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { businessName, address },
      { new: true }
    );
    res.json(publicUser(user));
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
