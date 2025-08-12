const mongoose = require("mongoose");

const branchSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      maxlength: 100,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      maxlength: 10,
      uppercase: true,
    },
    address: {
      type: String,
      required: true,
      maxlength: 200,
    },
    contactNumber: {
      type: String,
      match: [/^\d{10}$/, "Please enter a valid 10-digit phone number"],
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Manager",
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Branch", branchSchema);
