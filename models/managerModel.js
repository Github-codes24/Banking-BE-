const mongoose = require("mongoose");
const { Schema } = mongoose;

const managerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 50 },

    contact: {
      type: String,
      required: true,
        unique: true,
      match: [/^\d{10}$/, "Please enter a valid 10-digit mobile number"],
    },

    email: {
      type: String,
        unique: true,
      unique: true,
    },

    gender: { type: String },

    address: { type: String, maxlength: 200 },

    education: { type: String },

    alternateNumber: {
      type: String,
    
      match: [/^\d{10}$/, "Please enter a valid 10-digit mobile number"],
    },
    resetPasswordOtp: { type: String },
    resetPasswordOtpExpires: { type: Date },
    otpVerified: { type: Boolean, default: false },
  password: { type: String, required: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch" },
      bank:{type:String,default:"Maa Anusaya Urban"}
  },
  { timestamps: true } // ✅ Correct placement of schema options
);

module.exports = mongoose.model("Manager", managerSchema);
