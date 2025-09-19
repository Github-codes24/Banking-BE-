const mongoose = require("mongoose");
const { Schema } = mongoose;

const agentSchema = new Schema(
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
    },

    gender: { type: String },

    address: { type: String, maxlength: 200 },

    education: { type: String },

    alternateNumber: {
      type: String,
      match: [/^\d{10}$/, "Please enter a valid 10-digit mobile number"],
    },

    password: { type: String ,required: true},
    resetPasswordOtp: { type: String },
    resetPasswordOtpExpires: { type: Date },
    otpVerified: { type: Boolean, default: false },
    managerId: { type: Schema.Types.ObjectId,required:true, ref: "Manager" },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch" },
    isActive: { type: Boolean, default: true },
    bank: { type: String, default: "Maa Anusaya Urban" },
    // isActive:{type:Boolean ,default:true}
  },
  { timestamps: true } // ✅ Correct placement of schema options
);

module.exports = mongoose.model("Agent", agentSchema);
