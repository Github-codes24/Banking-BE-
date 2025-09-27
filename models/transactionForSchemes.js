const mongoose = require("mongoose");

const transactionSchemaForSchemes = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    schemeType: {
      type: String,
      enum: ["FD", "RD", "LOAN", "PIGMY" ,"SAVING_ACCOUNT"],
      required: true,
    },
    accountNumber: { type: String, required: true }, // FD/RD account number

    transactionType: {
      type: String,
      enum: ["deposit", "withdrawal", "emi", "maturityPayout", "penality"],
      required: true,
    },

    amount: { type: Number, required: true },

    mode: {
      type: String,
      enum: ["cash", "bankTransfer", "upi","cheque","card"],
      required: true,
    },

    transactionId: { type: String }, // e.g., UPI ID, bank ref no, cheque no
    installmentNo: { type: Number }, // for RD EMI tracking
    date: { type: Date, default: Date.now },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },

    agentId: { type: mongoose.Schema.Types.ObjectId, ref: "Agent" },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: "Manager" },
    areaManagerId: { type: mongoose.Schema.Types.ObjectId, ref: "AreaManager" },

    remarks: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TransactionSchemes", transactionSchemaForSchemes);
