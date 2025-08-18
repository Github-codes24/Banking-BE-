const mongoose = require("mongoose");
const { Schema } = mongoose;

const transactionSchema = new Schema(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    schemeType: {
    type: Schema.Types.ObjectId, ref: "Ledger",

      required: true
    },
    savingAccountNumber: { type: String, required: true },
    schemeAccountNumber: { type: String, required: true },
    transactionType: {
      type: String,
      enum: ["deposit", "withdrawal", "emiPayment", "loanDisbursement", "maturityPayout","emiPrepayment"],
      required: true
    },
    amount: { type: Number, required: true },
    transactionDate: { type: Date, default: Date.now },
    paymentMethod: {
      type: String,
      enum: ["cash", "bankTransfer", "UPI", "cheque"],
      default: "cash"
    },
    collectedByAgentId: { type: Schema.Types.ObjectId, ref: "Agent",required: true  },
    remarks: { type: String },
    balanceAfterTransaction: { type: Number },

    // New field for manager approval
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },
    approvedByManagerId: { type: Schema.Types.ObjectId, ref: "Manager",required: true  },
    managerId: { type: Schema.Types.ObjectId, ref: "Manager" },
    rejectionReason: { type: String }
  },
  { timestamps: true }
);



module.exports = mongoose.model("Transaction", transactionSchema);
