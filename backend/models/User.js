const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    businessName: { type: String, required: true },
    address: { type: String, default: "" },
    role: { type: String, enum: ["superadmin", "admin", "staff"], default: "staff" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    disabled: { type: Boolean, default: false },
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
