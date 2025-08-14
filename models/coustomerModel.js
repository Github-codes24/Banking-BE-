const mongoose = require("mongoose");
const { Schema } = mongoose;

const coustomerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 50 },

    contact: {
      type: String,
      unique: true,
      required: true,
      match: [/^\d{10}$/, "Please enter a valid 10-digit mobile number"],
    },

    email: {
      type: String,
      unique: true,
    },

    gender: { type: String },

    address: { type: String, maxlength: 200 },

    // scheme:{type:String},
    // amount:{type:String},
    // duration:{type:String},
    // pending:{type:String},
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch" },
    bank:{type:String,default:"Maa Anusaya Urban"},
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: "Manager" }, // Manager responsible
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: "Agent" },
    schemes: [
      {
        type: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Ledger",
        },
        accountNumber: { type: String,required:true, unique: true },
        startDate: { type: Date },
        maturityDate: { type: Date }, // FD, RD, Loan

        principalAmount: { type: Number },
        interestRate: { type: Number }, // percentage
        balance: { type: Number, default: 0 },
        status: { type: String, enum: ["active", "closed"], default: "active" },

        // FD specific fields
        fdPayoutFrequency: {
          type: String,
          enum: ["monthly", "quarterly", "half-yearly", "yearly", "onMaturity"],
        },

        // RD specific fields
        rdInstallmentAmount: { type: Number }, // monthly installment
        rdDurationMonths: { type: Number },

        // Pigmy specific fields
        pigmyDailyDeposit: { type: Number },
        pigmyCollectorId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Agent",
        },

        // Daily Deposit specific fields
        dailyDepositAmount: { type: Number },
        dailyDepositCollectorId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Agent",
        },

        // Loan specific fields
        loanEMIAmount: { type: Number },
        loanDurationMonths: { type: Number },
        loanRemainingEmis: { type: Number },
        lastEmiDate: { type: Date },
        nextEmiDate: { type: Date },
      },
    ],
  },
  { timestamps: true } // ✅ Correct placement of schema options
);

module.exports = mongoose.model("Customer", coustomerSchema);
