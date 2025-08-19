// controllers/transactionController.js
const Transaction = require("../models/transactionModel");
const Customer = require("../models/coustomerModel");

function calculateNextEmiDate(disbursementDate, frequency) {
  const date = new Date(disbursementDate);
  if (frequency === "monthly") date.setMonth(date.getMonth() + 1);
  if (frequency === "quarterly") date.setMonth(date.getMonth() + 3);
  if (frequency === "yearly") date.setFullYear(date.getFullYear() + 1);
  return date;
}

exports.savingAccountTransaction = async (req, res) => {
  try {
    const {
      customerId,
      savingAccountNumber,
      transactionType, // "deposit" or "withdrawal"
      schemeType,
      amount,
      paymentMethod,
      collectedByAgentId,
      remarks,
    } = req.body;

    // Validate request
    if (!customerId || !savingAccountNumber || !transactionType || !amount) {
      return res.status(400).json({
        success: false,
        message:
          "customerId, savingAccountNumber, transactionType, and amount are required",
      });
    }

    // Find customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Ensure saving account matches
    if (customer.savingAccountNumber !== savingAccountNumber) {
      return res.status(400).json({
        success: false,
        message:
          "Saving account number does not match with the customer's record",
      });
    }

    // Calculate new balance
    let currentBalance = parseFloat(customer.savingAccountBalance || 0);
    let newBalance = currentBalance;

    if (transactionType === "deposit") {
      newBalance += parseFloat(amount);
    } else if (transactionType === "withdrawal") {
      if (amount > currentBalance) {
        return res.status(400).json({
          success: false,
          message: "Insufficient balance for withdrawal",
        });
      }
      newBalance -= parseFloat(amount);
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction type",
      });
    }

    // Create transaction
    const transaction = await Transaction.create({
      customerId,
      managerId: customer.managerId,
      schemeType, // fixed
      savingAccountNumber,
      schemeAccountNumber: savingAccountNumber,
      transactionType,
      amount,
      paymentMethod,
      collectedByAgentId,
      remarks,
      balanceAfterTransaction: newBalance,
      status: "pending",
    });

    // Optional: update balance in customer (only after approval in real flow)
    // customer.savingAccountBalance = newBalance;
    // await customer.save();

    res.status(201).json({
      success: true,
      data: transaction,
    });
  } catch (err) {
    console.error("Error in savingAccountTransaction:", err);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

exports.fdTransaction = async (req, res) => {
  try {
    const {
      customerId,
      fdAccountNumber,
      schemeType,
      transactionType,
      amount,
      paymentMethod,
      collectedByAgentId,
      remarks,
    } = req.body;

    // Find customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }

    // Find FD scheme inside customer's schemes array
    const scheme = customer.schemes.find(
      (s) =>
        s.fdAccountNumber === fdAccountNumber &&
        String(s.type) === String(schemeType)
    );

    if (!scheme) {
      return res
        .status(404)
        .json({ success: false, message: "FD scheme not found for customer" });
    }

    let payoutAmount = 0;

    if (transactionType === "deposit") {
      if (scheme.fdDepositAmount && Number(scheme.fdDepositAmount) > 0) {
        return res.status(400).json({
          success: false,
          message: "FD deposit already made for this scheme",
        });
      }

      // Set deposit amount
      scheme.fdDepositAmount = amount;
      scheme.fdAccountStatus = "active";
      payoutAmount = amount;
    } else if (transactionType === "maturityPayout") {
      const now = new Date();

      if (!scheme.fdMaturityDate || new Date(scheme.fdMaturityDate) > now) {
        return res.status(400).json({
          success: false,
          message: "FD scheme has not matured yet",
        });
      }

      if (scheme.fdAccountStatus === "closed") {
        return res.status(400).json({
          success: false,
          message: "FD scheme already closed",
        });
      }

      // Pay out maturity amount
      payoutAmount = Number(scheme.fdMaturityAmount) || 0;

      if (payoutAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid maturity amount",
        });
      }

      // Mark FD as closed
      scheme.fdAccountStatus = "closed";
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction type",
      });
    }

    // Save updated scheme in customer
    // await customer.save();

    // Create transaction (pending until manager approves)
    const transaction = await Transaction.create({
      customerId,
      managerId: customer.managerId,
      schemeType,
      savingAccountNumber: customer.savingAccountNumber, // ✅ customer’s saving account
      schemeAccountNumber: fdAccountNumber,
      transactionType,
      amount: payoutAmount,
      paymentMethod,
      collectedByAgentId,
      remarks,
      balanceAfterTransaction: payoutAmount, // for FD it's just deposit/maturity
      status: "pending",
    });

    res.status(201).json({ success: true, data: transaction });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: "Server Error",
      message: err.message,
    });
  }
};

exports.rdTransaction = async (req, res) => {
  try {
    const {
      customerId,
      rdAccountNumber,
      schemeType,
      transactionType,
      amount,
      paymentMethod,
      collectedByAgentId,
      remarks,
    } = req.body;

    // Find customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }

    // Find RD scheme inside customer's schemes array
    const scheme = customer.schemes.find(
      (s) =>
        s.rdAccountNumber === rdAccountNumber &&
        String(s.type) === String(schemeType)
    );

    if (!scheme) {
      return res
        .status(404)
        .json({ success: false, message: "RD scheme not found for customer" });
    }

    // Validation only — no balance updates yet
    if (transactionType === "deposit") {
      const expectedInstallment = Number(scheme.rdInstallAmount) || 0;

      if (amount !== expectedInstallment) {
        return res.status(400).json({
          success: false,
          message: `Installment must be exactly ${expectedInstallment}`,
        });
      }
    } else if (transactionType === "maturityPayout") {
      const now = new Date();

      if (!scheme.rdMaturityDate || new Date(scheme.rdMaturityDate) > now) {
        return res.status(400).json({
          success: false,
          message: "RD scheme has not matured yet",
        });
      }

      if (scheme.rdAccountStatus === "closed") {
        return res.status(400).json({
          success: false,
          message: "RD scheme already closed",
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction type",
      });
    }

    // Create transaction (pending approval)
    const transaction = await Transaction.create({
      customerId,
      managerId: customer.managerId,
      schemeType,
      savingAccountNumber: customer.savingAccountNumber,
      schemeAccountNumber: rdAccountNumber,
      transactionType,
      amount,
      paymentMethod,
      collectedByAgentId,
      remarks,
      balanceAfterTransaction: 0, // will be set after approval
      status: "pending",
    });

    res.status(201).json({ success: true, data: transaction });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: "Server Error",
      message: err.message,
    });
  }
};

exports.loanTransaction = async (req, res) => {
  try {
    const {
      customerId,
      loanAccountNumber,
      schemeType,
      transactionType,
      amount,
      paymentMethod,
      collectedByAgentId,
      remarks,
    } = req.body;

    // Find customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }

    // Find Loan scheme inside customer's schemes array
    const scheme = customer.schemes.find(
      (s) =>
        s.loanAccountNumber === loanAccountNumber &&
        String(s.type) === String(schemeType)
    );

    if (!scheme) {
      return res.status(404).json({
        success: false,
        message: "Loan scheme not found for customer",
      });
    }

    // Validation only — actual updates happen after manager approves
    if (transactionType === "emiPayment") {
      if (scheme.loanStatus !== "active") {
        return res.status(400).json({
          success: false,
          message: "Loan is not active",
        });
      }

      if (amount !== Number(scheme.loanEMIAmount)) {
        return res.status(400).json({
          success: false,
          message: `EMI amount must be exactly ${scheme.loanEMIAmount}`,
        });
      }
    } else if (transactionType === "emiPrepayment") {
      if (scheme.loanStatus !== "active") {
        return res.status(400).json({
          success: false,
          message: "Loan is not active",
        });
      }

      // const remaining =
      //   (Number(scheme.loanRemainingEmis) || 0) *
      //   (Number(scheme.loanEMIAmount) || 0);
      if (amount < scheme.loanOutstandingAmount) {
        return res.status(400).json({
          success: false,
          message: `Prepayment must be equal or greater than remaining balance (${ scheme.loanOutstandingAmount})`,
        });
      }
    } else if (transactionType === "loanDisbursement") {
      if (scheme.loanStatus !== "active") {
        return res.status(400).json({
          success: false,
          message: "Loan is not active",
        });
      }

      if (amount !== Number(scheme.loandPrincipalAmount)) {
        return res.status(400).json({
          success: false,
          message: `Disbursement must equal principal amount ${scheme.loandPrincipalAmount}`,
        });
      }

      if (
        scheme.loanTotalEmiDeposited &&
        Number(scheme.loanTotalEmiDeposited) > 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Loan already disbursed",
        });
      }

      // ✅ Add loan amount to customer's saving account
      customer.savingAccountBalance =
        Number(customer.savingAccountBalance || 0) + Number(amount);

      // ✅ Update loan details
      scheme.loanDisbursementDate = new Date();
      scheme.loanOutstandingAmount = Number(amount);
      scheme.loanTotalEmiDeposited = 0;
      scheme.loanRemainingEmis = scheme.loanTotalEmis; // initially full
      scheme.loanLastEmiDate = null;
      scheme.loanNextEmiDate = calculateNextEmiDate(
        scheme.loanDisbursementDate,
        scheme.loanEMIFrequency
      );

      await customer.save();
      await scheme.save();
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction type",
      });
    }

    // Create transaction (pending until manager approves)
    const transaction = await Transaction.create({
      customerId,
      managerId: customer.managerId,
      schemeType,
      savingAccountNumber: customer.savingAccountNumber,
      schemeAccountNumber: loanAccountNumber,
      transactionType,
      amount,
      paymentMethod,
      collectedByAgentId,
      remarks,
      balanceAfterTransaction: 0, // will be updated after approval
      status: "pending",
    });

    res.status(201).json({ success: true, data: transaction });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: "Server Error",
      message: err.message,
    });
  }
};

exports.pigMyTransaction = async (req, res) => {
  try {
    const {
      customerId,
      pigmyAccountNumber,
      schemeType,
      transactionType, // deposit / withdrawal / maturityPayout
      amount,
      paymentMethod,
      collectedByAgentId,
      remarks,
    } = req.body;

    // 1. Find customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }

    // 2. Find Pigmy scheme inside customer's schemes
    const scheme = customer.schemes.find(
      (s) =>
        s.pigMyAccountNumber === pigmyAccountNumber &&
        String(s.type) === String(schemeType)
    );

    if (!scheme) {
      return res.status(404).json({
        success: false,
        message: "Pigmy scheme not found for customer",
      });
    }

    // 3. Transaction validations
    if (transactionType === "deposit") {
      if (amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Deposit amount must be greater than 0",
        });
      }
    } else if (
      transactionType === "withdrawal" ||
      transactionType === "maturityPayout"
    ) {
      if (scheme.balance < amount) {
        return res.status(400).json({
          success: false,
          message: "Insufficient balance in Pigmy account",
        });
      }
    }

    // 4. Create transaction (pending approval)
    const transaction = await Transaction.create({
      customerId,
      managerId: customer.managerId,
      schemeType,
      savingAccountNumber: customer.savingAccountNumber, // keep consistency
      schemeAccountNumber: pigmyAccountNumber,
      transactionType,
      amount,
      paymentMethod,
      collectedByAgentId,
      remarks,
      balanceAfterTransaction: scheme.balance, // keep current balance (will update after approval)
      status: "pending",
    });

    res.status(201).json({ success: true, data: transaction });
  } catch (err) {
    console.error("Pigmy Transaction Error:", err);
    res.status(500).json({
      success: false,
      error: "Server Error",
      message: err.message,
    });
  }
};

exports.lakhpatiYojnaTransaction = async (req, res) => {
  try {
    const {
      customerId,
      lakhpatiAccountNumber,
      schemeType,
      transactionType,
      amount,
      paymentMethod,
      collectedByAgentId,
      remarks,
    } = req.body;

    // ✅ Find customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }

    // ✅ Find Lakhpati Yojna account inside customer's lakhpatiYojnaAccounts array
    const account = customer.schemes.find(
      (a) =>
        a.lakhpatiYojanaAccountNumber === lakhpatiAccountNumber &&
        String(a.type) === String(schemeType)
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Lakhpati Yojna account not found for customer",
      });
    }

    // ✅ Validate transaction type
    if (!["deposit", "payout"].includes(transactionType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction type for Lakhpati Yojna",
      });
    }

    // ✅ Create transaction (pending until manager approves)
    const transaction = await Transaction.create({
      customerId,
      managerId: customer.managerId,
      schemeType,
      savingAccountNumber: customer.savingAccountNumber,
      transactionType,
      amount,
      schemeAccountNumber: lakhpatiAccountNumber,
      paymentMethod,
      collectedByAgentId,
      remarks,
      balanceAfterTransaction: 0, // Will be updated after approval
      status: "pending",
    });

    res.status(201).json({ success: true, data: transaction });
  } catch (err) {
    console.error("Lakhpati Yojna Transaction Error:", err);
    res.status(500).json({
      success: false,
      error: "Server Error",
      message: err.message,
    });
  }
};

// exports.addTransaction = async (req, res) => {
//   try {
//     const {
//       customerId,
//       schemeType,
//       accountNumber,
//       transactionType,
//       amount,
//       paymentMethod,
//       collectedByAgentId,
//       remarks,
//       managerId // ✅ Added managerId in request body
//     } = req.body;

//     const customer = await Customer.findById(customerId);
//     if (!customer) {
//       return res.status(404).json({ success: false, message: "Customer not found" });
//     }

//     const scheme = customer.schemes.find(
//       (s) => s.accountNumber === accountNumber && s.type === schemeType
//     );
//     if (!scheme) {
//       return res.status(404).json({ success: false, message: "Scheme not found for customer" });
//     }

//     // Create transaction (still pending until manager approves)
//     const transaction = await Transaction.create({
//       customerId,
//       managerId, // ✅ Save managerId
//       schemeType,
//       accountNumber,
//       transactionType,
//       amount,
//       paymentMethod,
//       collectedByAgentId,
//       remarks,
//       balanceAfterTransaction: scheme.balance, // Current balance, will change after approval
//       status: "pending"
//     });

//     res.status(201).json({ success: true, data: transaction });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

exports.getTransactions = async (req, res) => {
  try {
    const {
      schemeType,
      customerId,
      fromDate,
      toDate,
      accountNumber,
      transactionType
    } = req.query;

    let filter = {};

    if (schemeType) filter.schemeType = schemeType;
    if (customerId) filter.customerId = customerId;
    if (accountNumber) filter.accountNumber = accountNumber;
    if (transactionType) filter.transactionType = transactionType; // ✅ new filter

    if (fromDate || toDate) {
      filter.transactionDate = {};
      if (fromDate) filter.transactionDate.$gte = new Date(fromDate);
      if (toDate) filter.transactionDate.$lte = new Date(toDate);
    }

    const transactions = await Transaction.find(filter)
      .populate("customerId", "name contact")
      .populate("collectedByAgentId", "name contact")
      .sort({ transactionDate: -1 });

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};



// ✅ Get transactions filtered by managerId and transactionType
exports.getTransactionsByManager = async (req, res) => {
  try {
    const { managerId } = req.params;
    const { transactionType } = req.query; // pass in query string

    if (!managerId) {
      return res.status(400).json({ success: false, message: "ManagerId is required" });
    }

    let filter = { managerId };

    if (transactionType) {
      filter.transactionType = transactionType;
    }

    const transactions = await Transaction.find(filter)
      .populate("customerId", "name contact")
      .populate("collectedByAgentId", "name contact")
      .sort({ transactionDate: -1 });

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};


exports.getTodayYesterdayTransactionsManager = async (req, res) => {
  try {
    const { managerId } = req.params;

    if (!managerId) {
      return res.status(400).json({ success: false, message: "ManagerId required" });
    }

    // Get today's start and end
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Get yesterday's start and end
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const yesterdayEnd = new Date(todayEnd);
    yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);

    // Query for today
    const todayTransactions = await Transaction.find({
      managerId,
      transactionDate: { $gte: todayStart, $lte: todayEnd },
    })
      .populate("customerId", "name contact")
      .populate("collectedByAgentId", "name contact")
      .sort({ transactionDate: -1 });

    // Query for yesterday
    const yesterdayTransactions = await Transaction.find({
      managerId,
      transactionDate: { $gte: yesterdayStart, $lte: yesterdayEnd },
    })
      .populate("customerId", "name contact")
      .populate("collectedByAgentId", "name contact")
      .sort({ transactionDate: -1 });

    res.status(200).json({
      success: true,
      today: todayTransactions,
      yesterday: yesterdayTransactions,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};




exports.getTodayYesterdayTransactions = async (req, res) => {
  try {
    // 📅 Today range
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // 📅 Yesterday range
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(todayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayEnd);
    yesterdayEnd.setDate(todayEnd.getDate() - 1);

    // ✅ Fetch today’s transactions
    const todayTransactions = await Transaction.find({
      transactionDate: { $gte: todayStart, $lte: todayEnd }
    })
      .populate("customerId", "name contact")
      .populate("collectedByAgentId", "name contact")
      .sort({ transactionDate: -1 });

    // ✅ Fetch yesterday’s transactions
    const yesterdayTransactions = await Transaction.find({
      transactionDate: { $gte: yesterdayStart, $lte: yesterdayEnd }
    })
      .populate("customerId", "name contact")
      .populate("collectedByAgentId", "name contact")
      .sort({ transactionDate: -1 });

    res.status(200).json({
      success: true,
      todayCount: todayTransactions.length,
      yesterdayCount: yesterdayTransactions.length,
      todayTransactions,
      yesterdayTransactions,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};


exports.getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate("customerId", "name contact")
      .populate("collectedByAgentId", "name contact");

    if (!transaction) {
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    }

    res.status(200).json({ success: true, data: transaction });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    }

    await transaction.remove();
    res
      .status(200)
      .json({ success: true, message: "Transaction deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

function getNextEmiDate(lastDate, frequency) {
  const d = new Date(lastDate);
  if (frequency === "monthly") d.setMonth(d.getMonth() + 1);
  else if (frequency === "quarterly") d.setMonth(d.getMonth() + 3);
  else if (frequency === "yearly") d.setFullYear(d.getFullYear() + 1);
  return d;
}

exports.approveTransaction = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { status, managerId, rejectionReason } = req.body;

    // 1. Find transaction
    const txn = await Transaction.findById(transactionId);
    if (!txn) {
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    }

    // 2. Update status
    txn.status = status;
    txn.approvedByManagerId = status === "approved" ? managerId : undefined;
    txn.rejectionReason = status === "rejected" ? rejectionReason : undefined;
    await txn.save();

    // 3. If approved, update the correct customer scheme balance
    if (status === "approved") {
      const customer = await Customer.findById(txn.customerId);
      if (!customer) {
        return res
          .status(404)
          .json({ success: false, message: "Customer not found" });
      }

      let scheme;

      // find the correct scheme by matching account number
      scheme = customer.schemes.find(
        (s) =>
          s.fdAccountNumber === txn.schemeAccountNumber ||
          s.rdAccountNumber === txn.schemeAccountNumber ||
          s.loanAccountNumber === txn.schemeAccountNumber ||
          s.pigMyAccountNumber === txn.schemeAccountNumber ||
          s.lakhpatiYojanaAccountNumber === txn.schemeAccountNumber
      );

      if (!scheme) {
        return res
          .status(400)
          .json({ success: false, message: "Scheme not found in customer" });
      }

      // ---- FD ----
      if (
        scheme.fdAccountNumber &&
        txn.schemeAccountNumber === scheme.fdAccountNumber
      ) {
        if (txn.transactionType === "deposit") {
          scheme.fdDepositAmount =
            (Number(scheme.fdDepositAmount) || 0) + txn.amount;

          // Calculate maturity amount based on deposit, tenure & tenure type
          let deposit = Number(scheme.fdDepositAmount) || 0;
          let rate = Number(scheme.fdInterestRate) || 0; // assuming interestRate is saved in Ledger/Scheme
          let tenure = Number(scheme.fdTenure) || 0;
          let tenureType = scheme.fdTenureType; // "month" or "year"

          // Convert tenure into years
          let tenureInYears = tenureType === "month" ? tenure / 12 : tenure;

          // Simple Interest Calculation
          let maturityAmount = deposit + (deposit * rate * tenureInYears) / 100;

          scheme.fdMaturityAmount = maturityAmount.toFixed(2);
          scheme.fdAccountStatus = "active";
        } else if (txn.transactionType === "maturityPayout") {
          scheme.fdMaturityAmount =
            (Number(scheme.fdMaturityAmount) || 0) - txn.amount;
                   scheme.fdAccountStatus = "closed";
        scheme.fdCloseDate = new Date();
        }
        txn.balanceAfterTransaction = Number(scheme.fdDepositAmount || 0);

      }

      // ---- RD ----
      else if (
        scheme.rdAccountNumber &&
        txn.schemeAccountNumber === scheme.rdAccountNumber
      ) {
        if (txn.transactionType === "deposit") {
          // Add amount
         // Calculate RD maturity amount (Indian banking standard)
scheme.rdTotalDepositedtAmount = (Number(scheme.rdTotalDepositedtAmount) || 0) + txn.amount;
scheme.rdTotalInstallments = (Number(scheme.rdTotalInstallments) || 0) + 1;

const P = Number(txn.amount) || 0; // Monthly installment amount
const annualRate = Number(scheme.rdInterestRate) || 0; // Annual interest rate in percentage
const tenure = Number(scheme.rdTenure) || 0;
const tenureType = scheme.rdTenureType; // "month" or "year"

// Convert tenure to months
const totalMonths = tenureType === "month" ? tenure : tenure * 12;

// Quarterly compounding (standard in Indian RDs)
const quarterlyRate = annualRate / 4; // Quarterly interest rate in percentage

let totalMaturity = 0;

// Calculate maturity using the standard RD formula
for (let month = 1; month <= totalMonths; month++) {
    // Calculate quarters remaining for each installment
    const quartersRemaining = (totalMonths - month + 1) / 3;

    // Calculate interest for each installment
    const interest = P * quarterlyRate * quartersRemaining;

    totalMaturity += P + interest;
}

// Alternative formula (mathematically equivalent)
// const i = annualRate / 400; // Quarterly interest rate in decimal
// const n = totalMonths / 3;  // Number of quarters
// totalMaturity = P * [((Math.pow(1 + i, n) - 1) / (1 - Math.pow(1 + i, -1/3))];

scheme.rdMaturityAmount = totalMaturity.toFixed(2);
scheme.rdAccountStatus = "active";
        } else if (txn.transactionType === "maturityPayout") {
          scheme.rdMaturityAmount = (scheme.rdMaturityAmount || 0) - txn.amount;
          scheme.rdAccountStatus = "closed";
          scheme.rdCloseDate = new Date();
        }
        txn.balanceAfterTransaction = scheme.rdTotalDepositedtAmount || 0;
      }

      // ---- Lakhpati Yojna ----
      else if (
        scheme.lakhpatiYojanaAccountNumber &&
        txn.schemeAccountNumber === scheme.lakhpatiYojanaAccountNumber
      ) {
        if (txn.transactionType === "deposit") {
          // Total deposited
          scheme.lakhpatiYojanaTotalDepositedAmount =
            (Number(scheme.lakhpatiYojanaTotalDepositedAmount) || 0) +
            txn.amount;

          // Count installments
          scheme.lakhpatiYojanaTotalInstallments =
            (Number(scheme.lakhpatiYojanaTotalInstallments) || 0) + 1;

          // Monthly installment (assuming txn.amount is the fixed installment)
          let P = Number(txn.amount) || 0;
          let rate = Number(scheme.lakhpatiYojanaInterestRate) || 0; // Annual %
          let tenure = Number(scheme.lakhpatiYojanaTenure) || 0;
          let tenureType = scheme.lakhpatiYojanaTenureType; // "month" or "year"

          // Convert tenure to years
          let t = tenureType === "month" ? tenure / 12 : tenure;

          // Compounding frequency (quarterly, same as RD/FD logic)
          let n = 4;
          let r = rate / 100;

          // Lakhpati Yojana maturity formula (similar to RD maturity)
          let maturity =
            P *
            ((Math.pow(1 + r / n, n * t) - 1) /
              (1 - Math.pow(1 + r / n, -1 / 12)));

          scheme.lakhpatiYojanaMaturityAmount = maturity.toFixed(2);
          scheme.lakhpatiYojanaAccountStatus = "active";
        } else if (txn.transactionType === "maturityPayout") {
          scheme.lakhpatiYojanaMaturityAmount =
            (scheme.lakhpatiYojanaMaturityAmount || 0) - txn.amount;
          scheme.lakhpatiYojanaAccountStatus = "closed";
          scheme.lakhpatiYojanaCloseDate = new Date();
        }
        txn.balanceAfterTransaction =
          scheme.lakhpatiYojanaTotalDepositedAmount || 0;
      }

      // ---- Pigmy ----
      else if (
        scheme.pigMyAccountNumber &&
        txn.schemeAccountNumber === scheme.pigMyAccountNumber
      ) {
        if (txn.transactionType === "deposit") {
          // ---------------- PigMy Scheme ----------------
          scheme.pigMyTotalDepositedAmount =
            (Number(scheme.pigMyTotalDepositedAmount) || 0) + txn.amount;

          scheme.pigMyTotalInstallMents =
            (Number(scheme.pigMyTotalInstallMents) || 0) + 1;

          let P = Number(txn.amount) || 0; // daily installment
          let rate = Number(scheme.pigMyInterestRate) || 0; // annual interest in %
          let tenure = Number(scheme.pigMyTenure) || 0; // duration (days/months/years)
          let tenureType = scheme.pigMyTenureType; // "day" | "month" | "year"

          // Convert tenure to years
          let t = 0;
          if (tenureType === "day") t = tenure / 365;
          else if (tenureType === "month") t = tenure / 12;
          else if (tenureType === "year") t = tenure;

          let n = 365; // daily compounding
          let r = rate / 100;

          // Formula for Recurring Deposit (Pigmy Daily Installment)
          // maturity = P * [ ( (1+r/n)^(n*t) - 1 ) / (1 - (1+r/n)^(-1/n)) ]
          let maturity =
            P *
            ((Math.pow(1 + r / n, n * t) - 1) /
              (1 - Math.pow(1 + r / n, -1 / n)));

          scheme.pigMyMaturityAmount = maturity.toFixed(2);
        } else if (txn.transactionType === "withdrawal") {
          scheme.pigMyTotalDepositedAmount =
            (Number(scheme.pigMyTotalDepositedAmount) || 0) - txn.amount;
        }
        txn.balanceAfterTransaction = Number(
          scheme.pigMyTotalDepositedAmount || 0
        );
      }

      // ---- Loan ----
      else if (
        scheme.loanAccountNumber &&
        txn.schemeAccountNumber === scheme.loanAccountNumber
      ) {
        if (txn.transactionType === "loanDisbursement") {
          // When loan amount is disbursed
          scheme.loanDisbursementDate = txn.createdAt;
          scheme.loanOutstandingAmount =
            (Number(scheme.loanOutstandingAmount) || 0)
          scheme.loandPrincipalAmount =
            (Number(scheme.loandPrincipalAmount) || 0)
          scheme.loandDisbursed = true;
        } else if (txn.transactionType === "emiPayment") {
          // Regular EMI payment
          if (scheme.loanStatus !== "active") {
            throw new Error("Loan is not active");
          }

          if (txn.amount !== Number(scheme.loanEMIAmount)) {
            throw new Error(`EMI must be exactly ${scheme.loanEMIAmount}`);
          }

          scheme.loanTotalEmiDeposited =
            (Number(scheme.loanTotalEmiDeposited) || 0) + txn.amount;
          scheme.loanOutstandingAmount =
            (Number(scheme.loanOutstandingAmount) || 0) - txn.amount;

          scheme.loanRemainingEmis = (scheme.loanRemainingEmis || 0) - 1;
          scheme.loanLastEmiDate = txn.createdAt;

          // auto calculate next EMI date
          scheme.loanNextEmiDate = getNextEmiDate(
            txn.createdAt,
            scheme.loanEMIFrequency
          );

          if (
            scheme.loanRemainingEmis <= 0 ||
            scheme.loanOutstandingAmount <= 0
          ) {
            scheme.loanStatus = "closed";
          }
        } else if (txn.transactionType === "emiPrepayment") {
          // Extra payment made (bigger than EMI)
          if (scheme.loanStatus !== "active") {
            throw new Error("Loan is not active");
          }

          scheme.loanTotalEmiDeposited =
            (Number(scheme.loanTotalEmiDeposited) || 0) + txn.amount;
          scheme.loanOutstandingAmount =
            (Number(scheme.loanOutstandingAmount) || 0) - txn.amount;

          // reduce EMIs based on how much was prepaid
          const emiSize = Number(scheme.loanEMIAmount) || 1;
          const reducedEmis = Math.floor(txn.amount / emiSize);
          scheme.loanRemainingEmis = Math.max(
            (scheme.loanRemainingEmis || 0) - reducedEmis,
            0
          );

          scheme.loanLastEmiDate = txn.createdAt;
          scheme.loanNextEmiDate = getNextEmiDate(
            txn.createdAt,
            scheme.loanEMIFrequency
          );

          if (
            scheme.loanRemainingEmis <= 0 ||
            scheme.loanOutstandingAmount <= 0
          ) {
            scheme.loanStatus = "closed";
          }
        }

        txn.balanceAfterTransaction = Number(scheme.loanTotalEmiDeposited || 0);
      }

      // Save customer and transaction
      await customer.save();
      await txn.save();
    }



    res
      .status(200)
      .json({ success: true, message: "Transaction status updated", txn });
  } catch (error) {
    console.error("Error approving transaction:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.approveTransaactionForSavingAc = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { status, managerId, rejectionReason } = req.body;

    // 1. Find transaction
    const txn = await Transaction.findById(transactionId);
    if (!txn) {
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    }

    if (txn.status === "approved") {
      return res
        .status(400)
        .json({ success: false, message: "Transaction already approved" });
    }

    // 2. Update status
    txn.status = status;
    txn.approvedByManagerId = status === "approved" ? managerId : undefined;
    txn.rejectionReason = status === "rejected" ? rejectionReason : undefined;
    await txn.save();

    // 3. If approved, update the correct customer scheme balance
    if (status === "approved") {
      const customer = await Customer.findById(txn.customerId);
      if (!customer) {
        return res
          .status(404)
          .json({ success: false, message: "Customer not found" });
      }

      if (txn.transactionType === "deposit") {
        customer.savingAccountBalance =
          Number(customer.savingAccountBalance) + Number(txn.amount);
      } else if (txn.transactionType === "withdrawal") {
        customer.savingAccountBalance =
          Number(customer.savingAccountBalance) - Number(txn.amount);
      }

      await customer.save();
    }

    res
      .status(200)
      .json({ success: true, message: "Transaction status updated", txn });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// async function fixAgentIds() {
//   const txs = await Transaction.find({ collectedByAgentId: { $type: "string" } });

//   for (let tx of txs) {
//     await Transaction.updateOne(
//       { _id: tx._id },
//       { $set: { collectedByAgentId: mongoose.Types.ObjectId(tx.collectedByAgentId) } }
//     );
//   }

//   console.log("✅ Fixed", txs.length, "transactions");
// }

// fixAgentIds();