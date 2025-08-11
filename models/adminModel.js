const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 50 },
    email: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },

    banners: [
      {
        imageUrl: { type: String },
        isActive: { type: Boolean, default: true },
      },
    ],

    gallery: [
      {
        imageUrl: { type: String },
        caption: { type: String, trim: true },
        category: { type: String, trim: true }, // e.g. "events", "products"
      },
    ],
    careers: [
      {
        title: { type: String },
        desc: { type: String },
        contactPerson: { type: String },
        email: { type: String },
        location: { type: String },
        docs: { type: String },
      },
    ],
    loanApplication: [
      {
        title: { type: String },

        docs: { type: String },
      },
    ],
    legalDocs: [
      {
        title: { type: String },

        docs: { type: String },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Admin", adminSchema);
