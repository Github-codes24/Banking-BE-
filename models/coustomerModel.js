const mongoose = require("mongoose");
const { Schema } = mongoose;

const coustomerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 50 },

    contact: {
      type: String,

      required: true,
      match: [/^\d{10}$/, "Please enter a valid 10-digit mobile number"],
    },

    email: {
      type: String,
    },
    picture: {
      type: String,
      default:"https://avatar.iran.liara.run/public/boy"
    },
    gender: { type: String },

    address: { type: String, maxlength: 200 },

    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch" },
    bank: { type: String, default: "Maa Anusaya Urban" },
    areaManagerId: { type: Schema.Types.ObjectId, required: true, ref: "AreaManager" }, // Manager responsible
    managerId: { type: Schema.Types.ObjectId, required: true, ref: "Manager" }, // Manager responsible
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: "Agent" },

    //  account feild
    savingAccountNumber: { type: String, unique: true },
    savingAccountOpneingDate: { type: Date },
    savingAccountIntrestRate: { type: String },
    savingAccountWithdrawLimit: { type: String }, // FD, RD, Loan
    savingAccountStatus: {
      type: String,
      enum: ["active", "closed"],
      default: "active",
    },
    savingAccountBalance: { type: String, default: "0" },

    fdSchemes: [
      {
        type: {
          type: String,
        },
        savingAccountNo: {
          type: String,
        }
        ,
        // FD specific fields
        fdAccountNumber: { type: String },
        fdOpeningDate: { type: Date },
        fdDepositAmount: { type: String },
        fdPrincipalAmount: { type: String },
        fdInterestRate: { type: String },
        fdTenure: { type: String },
        fdTenureType: { type: String, enum: ["month", "day", "year"] },
        fdMaturityDate: { type: Date },
        fdMaturityAmount: { type: String },
        fdMaturityInstruction: { type: String },

        fdAccountStatus: {
          type: String,
          enum: ["active", "closed", "pending", "matured"],
        },
        fdCloseDate: { type: Date },

        // // lakhapti
        // lakhpatiYojanaAccountNumber: { type: String },
        // lakhpatiYojanaOpeningDate: { type: Date },
        // lakhpatiYojanaMaturityDate: { type: Date },
        // lakhpatiYojanaTenure: { type: String },
        // lakhpatiYojanaTenureType: {
        //   type: String,
        //   enum: ["month", "year", "week"],
        // },
        // lakhpatiYojanaInterestRate: { type: String },
        // lakhpatiYojanaInstallAmount: { type: String },
        // lakhpatiYojanaTotalInstallments: { type: String },
        // lakhpatiYojanaInstallMentsFrequency: {
        //   type: String,
        //   enum: ["monthly", "quarterly"],
        // },
        // lakhpatiYojanaTotalDepositedAmount: { type: Number },
        // lakhpatiYojanaMaturityAmount: { type: Number },
        // lakhpatiYojanaPayoutFrequency: {
        //   type: String,
        //   enum: ["monthly", "quarterly", "yearly", "atMaturity"],
        // },
        // lakhpatiYojanaAccountStatus: {
        //   type: String,
        //   enum: ["active", "closed", "matured"],
        //   default: "active",
        // },
        // lakhpatiYojanaCloseDate: { type: Date },
        // // Pigmy specific fields


        // // Loan specific fields

      },
    ],

    loans: [
      {
        loanAccountNumber: { type: String },
        loanOpeningDate: { type: Date },
        loanClosingDate: { type: Date },
        loanPrincipalAmount: { type: String },
        loanDisbursementDate: { type: Date },
        loanOutstandingAmount: { type: String },
        loanEMIAmount: { type: Number },
        loanDisbursed: { type: Boolean, default: false },
        loanEMIFrequency: {
          type: String,
          enum: ["monthly", "quarterly", "yearly"],
        },
        loanTotalEmiDeposited: { type: String },
        loanTotalNumberOfEmiDeposited: { type: String },
        loanInterestRate: { type: String },
        loanType: {
          type: String,
          enum: ["personal", "home", "auto", "education"],
        },

        loanStatus: {
          type: String,
          enum: ["active", "closed", "pending", "defaulted"],
          default: "active",
        },

        loanTenure: { type: String },
        loanTenureType: { type: String, enum: ["month", "year", "week"] },
        loanRemainingEmis: { type: Number },
        loanTotalEmis: { type: String },
        loanLastEmiDate: { type: Date },
        loanNextEmiDate: { type: Date },
      }
    ]
    ,
    pigmy: [
      {
        type: { type: String },
        pigMyAccountNumber: { type: String },
        pigMyOpeningDate: { type: Date },
        pigMyCloseDate: { type: Date },
        pigMyTenure: { type: String },
        pigMyTenureType: { type: String, enum: ["month", "year", "week"] },
        pigMyMaturityDate: { type: Date },
        pigMyInterestRate: { type: String },
        // pigMyTotalInstallMents: { type: String },
        pigMyTotalDepositedAmount: { type: String },
        pigMyTotalInstallmentDeposited: { type: String },
        pigmyDailyDeposit: { type: String },
        // 
        pigMyMaturityAmount: { type: String },
        pigMyAccountStatus: {
          type: String,
          enum: ["active", "closed", "pending", "matured"],
          default: "pending",
        },
      }
    ]
    ,
    rdSchemes: [
      {
        type: {
          type: String,
        },
        savingAccountNo: {
          type: String,
        },
        // RD specific fields
        rdAccountNumber: { type: String },
        rdOpeningDate: { type: Date },
        rdMaturityDate: { type: Date },
        rdTenure: { type: String },
        rdTenureType: { type: String, enum: ["month"] },
        rdInterestRate: { type: String },
        rdInstallAmount: { type: String },
        rdTotalInstallments: { type: String },
        rdInstallMentsFrequency: {
          type: String,
          enum: ["monthly"],
        },
        rdTotalDepositedtAmount: { type: Number },
        rdTotalDepositedInstallment: { type: Number },

        rdMaturityAmount: { type: Number },

        rdAccountStatus: {
          type: String,
          enum: ["active", "closed", "pending", "matured"],
          default: "active",
        },
        rdCloseDate: { type: Date },
      },
    ],

    QrCode: {
      type: String,
    },
    CustomerId: { type: String },

    Mpin: { type: String },

    password: { type: String },

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
    NomineeDetails: {
      name: { type: String },
      relation: { type: String },
      age: { type: String },
      dob: { type: Date },
      email: { type: String },
      mobile: {
        type: String,
        match: [/^\d{10}$/, "Please enter a valid 10-digit mobile number"],
      },
      AadharNo: {
        type: String,
        minlength: 12,
        maxlength: 12,
        match: [/^\d{12}$/, "Aadhar number must be 12 digits"],
      },
      panCard: { type: String },
      address: { type: String },
    },

    transactionPin: { type: Number, maxlength: 6 },
    otp: String,
    otpExpiry: Date,
    isOtpVerified: { type: Boolean, default: false },
  },
  { timestamps: true } // ✅ Correct placement of schema options
);

module.exports = mongoose.model("Customer", coustomerSchema);
