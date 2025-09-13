const Customer = require("../models/coustomerModel");
const Transaction = require("../models/transactionForSchemes");

const generateTransactionId = async (schemeType = "GEN") => {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  // Date part
  const datePart = `${yyyy}${mm}${dd}`;

  // Count how many transactions today for sequential number
  const count = await Transaction.countDocuments({
    createdAt: {
      $gte: new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`),
      $lte: new Date(`${yyyy}-${mm}-${dd}T23:59:59.999Z`),
    },
  });

  // Sequential number padded
  const seq = String(count + 1).padStart(4, "0");

  // Final ID
  return `TXN-${schemeType}-${datePart}-${seq}`;
};

exports.rdTransaction = async (req, res) => {
  try {
    const {
      customerId,
      rdAccountNumber,
      transactionType,
      amount,
      mode,

      agentId,
    //   remarks,
    } = req.body;

    // ✅ Find customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }

    // ✅ Find RD scheme
    const scheme = customer.rdSchemes.find(
      (s) => s.rdAccountNumber === rdAccountNumber
    );

    if (!scheme) {
      return res
        .status(404)
        .json({ success: false, message: "RD scheme not found for customer" });
    }

    // ✅ Validation & updates
    if (transactionType === "deposit") {
      const expectedInstallment = Number(scheme.rdInstallAmount) || 0;

      if (amount !== expectedInstallment) {
        return res.status(400).json({
          success: false,
          message: `Installment must be exactly ${expectedInstallment}`,
        });
      }

      // 🔹 Update scheme deposit tracking
      // scheme.rdTotalDepositedtAmount =
      //   (scheme.rdTotalDepositedtAmount || 0) + amount;

      // scheme.rdTotalDepositedInstallment =
      //   (scheme.rdTotalDepositedInstallment || 0) + 1;
    }
    else if (transactionType === "maturityPayout") {
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

      // 🔹 Mark as closed
      scheme.rdAccountStatus = "closed";
      scheme.rdCloseDate = now;
    }
    else {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction type",
      });
    }

    // ✅ Save updated customer
    await customer.save();

    // ✅ Create transaction entry
    const transactionId = await generateTransactionId("RD");
    const transaction = await Transaction.create({
      transactionId,
      customerId,
      schemeType: "RD",
      accountNumber: rdAccountNumber,
      transactionType,
      amount,
      mode,
      installmentNo:scheme.rdTotalDepositedInstallment+1,
      agentId,
      managerId: customer.managerId,
    //   remarks,
      status: "pending", // Approval flow
    });

    res.status(201).json({
      success: true,
      message: "RD transaction recorded successfully",
      data: { transaction, updatedScheme: scheme },
    });
  } catch (err) {
    console.error("RD Transaction Error:", err);
    res.status(500).json({
      success: false,
      error: "Server Error",
      message: err.message,
    });
  }
};
exports.fdTransaction = async (req, res) => {
  try {
    const {
      customerId,
      fdAccountNumber,
      transactionType,
      amount,
      mode,
      agentId,
      // remarks,
    } = req.body;

    // Find customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }

    // Find FD scheme inside customer's schemes array
    const scheme = customer.fdSchemes.find(
      (s) =>
        s.fdAccountNumber == fdAccountNumber
    );

    if (!scheme) {
      return res
        .status(404)
        .json({ success: false, message: "FD scheme not found for customer" });
    }

    let payoutAmount = 0;

    if (transactionType == "deposit") {
      if (scheme.fdDepositAmount && Number(scheme.fdDepositAmount) > 0) {
        return res.status(400).json({
          success: false,
          message: "FD deposit already made for this scheme",
        });
      }

     const expectedPrincipal = Number(scheme.fdPrincipalAmount || 0);
      if (Number(amount) !== expectedPrincipal) {
        return res.status(400).json({
          success: false,
          message: `Deposit must be exactly ${expectedPrincipal}`,
        });
      }

      // Save deposit
      // scheme.fdDepositAmount = amount;
      scheme.fdAccountStatus = "active";
      // payoutAmount = amount;
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
    await customer.save();
    const transactionId = await generateTransactionId("FD");
    // Create transaction (pending until manager approves)
    const transaction = await Transaction.create({
      customerId,
      transactionId,
      managerId: customer.managerId,
        schemeType: "FD",
      // ✅ customer’s saving account
      accountNumber: fdAccountNumber,
      transactionType,
      amount,
      mode,
      agentId,
      // remarks,
      // balanceAfterTransaction: payoutAmount, // for FD it's just deposit/maturity
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

exports.getTransaction = async(req,res)=>{
try {
    const {
      filter,
      accountNumber,
      agentId,
      customerId,
      schemeType,
      transactionType,
      status,
      page = 1,
      limit = 10
    } = req.query;

    let query = {};

    // 🔹 Date filters
    if (filter === "today") {
      query.createdAt = {
        $gte: moment().startOf("day").toDate(),
        $lte: moment().endOf("day").toDate(),
      };
    } else if (filter === "yesterday") {
      query.createdAt = {
        $gte: moment().subtract(1, "days").startOf("day").toDate(),
        $lte: moment().subtract(1, "days").endOf("day").toDate(),
      };
    }

    // 🔹 Search filters
    if (accountNumber) query.accountNumber = accountNumber;
    if (agentId) query.agentId = agentId;
    if (customerId) query.customerId = customerId;
    if (schemeType) query.schemeType = schemeType;
    if (transactionType) query.transactionType = transactionType;
    if (status) query.status = status;

    // 🔹 Pagination & sorting
    const transactions = await Transaction.find(query)
      .populate("agentId", "name email")
      .populate("customerId", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments(query);

    res.json({
      success: true,
      total,
      page: Number(page),
      limit: Number(limit),
      transactions,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
}

exports.getTransactionById = async (req, res) => {

 try {
    const { id } = req.params;

    const transaction = await Transaction.findById(id)
      .populate("agentId", "name email")
      .populate("customerId", "name email")
      .populate("managerId", "name email");

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    res.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }

}


