// controllers/transactionController.js
const Transaction = require("../models/transactionModel");
const Customer = require("../models/coustomerModel");

exports.addTransaction = async (req, res) => {
  try {
    const {
      customerId,
      schemeType,
      accountNumber,
      transactionType,
      amount,
      paymentMethod,
      collectedByAgentId,
      remarks,
      managerId // ✅ Added managerId in request body
    } = req.body;

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    const scheme = customer.schemes.find(
      (s) => s.accountNumber === accountNumber && s.type === schemeType
    );
    if (!scheme) {
      return res.status(404).json({ success: false, message: "Scheme not found for customer" });
    }

    // Create transaction (still pending until manager approves)
    const transaction = await Transaction.create({
      customerId,
      managerId, // ✅ Save managerId
      schemeType,
      accountNumber,
      transactionType,
      amount,
      paymentMethod,
      collectedByAgentId,
      remarks,
      balanceAfterTransaction: scheme.balance, // Current balance, will change after approval
      status: "pending"
    });

    res.status(201).json({ success: true, data: transaction });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};



exports.getTransactions = async (req, res) => {
  try {
    const { schemeType, customerId, fromDate, toDate, accountNumber } = req.query;

    let filter = {};
    if (schemeType) filter.schemeType = schemeType;
    if (customerId) filter.customerId = customerId;
    if (accountNumber) filter.accountNumber = accountNumber;
    if (fromDate || toDate) {
      filter.transactionDate = {};
      if (fromDate) filter.transactionDate.$gte = new Date(fromDate);
      if (toDate) filter.transactionDate.$lte = new Date(toDate);
    }

    const transactions = await Transaction.find(filter)
      .populate("customerId", "name contact")
      .populate("collectedByAgentId", "name contact")
      .sort({ transactionDate: -1 });

    res.status(200).json({ success: true, count: transactions.length, data: transactions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate("customerId", "name contact")
      .populate("collectedByAgentId", "name contact");

    if (!transaction) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
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
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    await transaction.remove();
    res.status(200).json({ success: true, message: "Transaction deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
exports.updateTransactionStatus = async (req, res) => {
  try {
    const { status, managerId, rejectionReason } = req.body;
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    // Update status
    transaction.status = status;
    transaction.approvedByManagerId = managerId;

    if (status === "rejected") {
      transaction.rejectionReason = rejectionReason || "Not specified";
    }

    // If approved, update customer scheme balance
    if (status === "approved") {
      const customer = await Customer.findById(transaction.customerId);
      const scheme = customer.schemes.find(s => s.accountNumber === transaction.accountNumber && s.type === transaction.schemeType);

      if (transaction.transactionType === "deposit" || transaction.transactionType === "emiPayment" || transaction.transactionType === "loanDisbursement") {
        scheme.balance += transaction.amount;
      } else if (transaction.transactionType === "withdrawal" || transaction.transactionType === "maturityPayout") {
        scheme.balance -= transaction.amount;
      }

      transaction.balanceAfterTransaction = scheme.balance;

      await customer.save();
    }

    await transaction.save();

    res.status(200).json({ success: true, data: transaction });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
