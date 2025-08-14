const mongoose = require("mongoose");

const ledgerSchema = new mongoose.Schema(
  {
    duration: [
      {
        durationType: { type: String, enum: ["day", "month", "year"] },
        duration:{type:String} // in months or years
      },
    ],
    interestRate: {
      type: Number, // percentage
      required: true,
    },

    ledgerType: {
      type: String,
      enum: [
        "RD",
        "Lakhpati Yojna",
        "PigMy",
        "Saving Account",
        "Daily Deposit",
        "Loan",
      ],
      required: true,
    },
  },
  { timestamps: true }
);

// export default mongoose.model("Ledger", ledgerSchema);
module.exports = mongoose.model("Ledger", ledgerSchema);
