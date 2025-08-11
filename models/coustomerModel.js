const mongoose = require("mongoose");
const { Schema } = mongoose;

const coustomerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 50 },

    contact: {
      type: String,
      unique:true,
      required: true,
      match: [/^\d{10}$/, "Please enter a valid 10-digit mobile number"],
    },

    email: {
      type: String,
      unique: true,
    },

    gender: { type: String },

    address: { type: String, maxlength: 200 },

    scheme:{type:String},
    amount:{type:String},
    duration:{type:String},
    pending:{type:String}
  },
  { timestamps: true } // ✅ Correct placement of schema options
);

module.exports = mongoose.model("Customer", coustomerSchema);
