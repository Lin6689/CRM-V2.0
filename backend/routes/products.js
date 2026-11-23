const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const Product = require("../models/Product");
const { authMiddleware, authorizeRoles } = require("../middleware/auth");

const router = express.Router();
router.use(authMiddleware);
router.use((req, res, next) => { req.bizId = req.user.businessId || req.bizId; next(); });

// Cloudinary configured hai to cloud pe upload, warna local disk
const useCloudinary =
  process.env.CLOUDINARY_URL ||
  (process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET);

let storage;
if (useCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  storage = new CloudinaryStorage({
    cloudinary,
    params: { folder: "crm-products", allowed_formats: ["jpg", "jpeg", "png", "webp"] },
  });
} else {
  const uploadDir = path.join(__dirname, "..", "public", "uploads");
  fs.mkdirSync(uploadDir, { recursive: true });
  storage = multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  });
}

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

const getImageUrl = (req) => {
  if (req.file) {
    return useCloudinary ? req.file.path : `/uploads/${req.file.filename}`;
  }
  return req.body.imageUrl || "";
};

// GET /api/products — pagination + search + sortBy
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", sortBy = "createdAt", startDate = "", endDate = "" } = req.query;
    const filter = { owner: req.bizId };
    if (search) {
      filter.$or = [
        { productName: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
      ];
    }
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate + "T23:59:59");
    }
    const sortMap = { name: { productName: 1 }, price: { price: 1 }, "-price": { price: -1 }, stock: { stockQuantity: 1 }, oldest: { createdAt: 1 } };
    const sort = sortMap[sortBy] || { createdAt: -1 };
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Product.find(filter).sort(sort).skip(skip).limit(Number(limit)),
      Product.countDocuments(filter),
    ]);
    res.json({ items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/products — admin only (staff sirf view kar sakta hai)
router.post("/", authorizeRoles("admin"), upload.single("image"), async (req, res) => {
  try {
    const { productName, sku, price, stockQuantity } = req.body;
    if (!productName || price === undefined || stockQuantity === undefined) {
      return res.status(400).json({ message: "productName, price and stockQuantity are required" });
    }
    if (sku) {
      const dupSku = await Product.findOne({ sku, owner: req.bizId, _id: { $ne: req.params?.id } });
      if (dupSku) return res.status(400).json({ message: "SKU already exists" });
    }
    const stock = Number(stockQuantity);
    if (stock < 0) return res.status(400).json({ message: "Stock cannot be negative" });

    const product = await Product.create({
      productName,
      sku: sku || "",
      price: Number(price),
      stockQuantity: stock,
      imageUrl: getImageUrl(req),
      owner: req.bizId,
    });
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message || "Server error" });
  }
});

// PUT /api/products/:id — admin only (price edit included)
router.put("/:id", authorizeRoles("admin"), upload.single("image"), async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.image;
    delete updates.owner;
    if (updates.sku) {
      const dupSku = await Product.findOne({ sku: updates.sku, owner: req.bizId, _id: { $ne: req.params.id } });
      if (dupSku) return res.status(400).json({ message: "SKU already exists" });
    }
    if (updates.stockQuantity !== undefined && Number(updates.stockQuantity) < 0) {
      return res.status(400).json({ message: "Stock cannot be negative" });
    }
    if (req.file) updates.imageUrl = getImageUrl(req);
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, owner: req.bizId },
      updates,
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message || "Server error" });
  }
});

// DELETE /api/products/:id — admin only
router.delete("/:id", authorizeRoles("admin"), async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ _id: req.params.id, owner: req.bizId });
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product deleted" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
