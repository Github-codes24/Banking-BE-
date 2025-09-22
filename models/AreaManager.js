const mongoose = require("mongoose");
const { Schema } = mongoose;

const areaManagerSchema = new Schema(
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
        AadharNo: {
            type: String,
            minlength: 12,
            maxlength: 12,
            match: [/^\d{12}$/, "Aadhar number must be 12 digits"],
        },
        panCard: { type: String },
        signature: {
            type: String
        }
        ,


        alternateNumber: {
            type: String,

            match: [/^\d{10}$/, "Please enter a valid 10-digit mobile number"],
        },
        resetPasswordOtp: { type: String },
        resetPasswordOtpExpires: { type: Date },
        otpVerified: { type: Boolean, default: false },
        // password: { type: String },
        managerId: { type: mongoose.Schema.Types.ObjectId, ref: "Manager",required:true },
        bank: { type: String, default: "Maa Anusaya Urban" }
    },
    { timestamps: true } // ✅ Correct placement of schema options
);

module.exports = mongoose.model("AreaManager", areaManagerSchema);
