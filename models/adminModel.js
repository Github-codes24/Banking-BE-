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
        type:{type: String }
      },
    ],

    gallery: [
      {
        imageUrls: [String],
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
    faq: [
      {
        question: { type: String },

        answer: { type: String },
      },
    ],
    schemes: [
      {
        name: { type: String },
        desc: { type: String },
        pdf: { type: String },
      },
    ],
   aboutsUs: {
  title: { type: String },
  desc: { type: String },
  imageUrl: { type: String },
  vision: { type: String },        // ✅ Single text
  values: [{ type: String }],      // ✅ Array of strings
},

  },
  { timestamps: true }
);

module.exports = mongoose.model("Admin", adminSchema);
