const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", required: true },
    amount: { type: Number, required: true, min: 0.01 },
    paymentMethod: {
      type: String,
      enum: ["Cash", "UPI", "Bank Transfer", "Card"],
      required: true,
    },
    paymentDate: { type: Date, default: Date.now },
    notes: { type: String, default: "" },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
