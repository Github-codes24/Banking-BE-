const Customer = require("../models/coustomerModel");
const Transaction = require("../models/transactionForSchemes");
const moment = require("moment")
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
      remarks,
    } = req.body;

    // 1. Find customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    // 2. Find RD scheme
    const scheme = customer.rdSchemes.find(
      (s) => s.rdAccountNumber === rdAccountNumber
    );
    if (!scheme) {
      return res.status(404).json({ success: false, message: "RD scheme not found for customer" });
    }

    // 3. Block if RD closed/matured
    if (["closed", "matured"].includes(scheme.rdAccountStatus)) {
      return res.status(400).json({
        success: false,
        message: `This RD scheme is already ${scheme.rdAccountStatus}`,
      });
    }

    const now = new Date();

    let totalPayableWithoutPenality;

    // 4. Handle EMI deposit
    if (transactionType === "emi") {
      const now = new Date();
      const openingDate = new Date(scheme.rdOpeningDate);

      // EMI amount
      const emiAmount = Number(scheme.rdInstallAmount) || 0;

      // Months passed since RD opening (0-based)
      const monthsPassed =
        (now.getFullYear() - openingDate.getFullYear()) * 12 +
        (now.getMonth() - openingDate.getMonth());

      // Already paid installments
      const paidInstallments = Number(scheme.rdTotalDepositedInstallment) || 0;

      // Check if all EMIs till current month are paid
      if (paidInstallments >= monthsPassed + 1) {
        return res.status(400).json({
          success: false,
          message: "All EMIs are already paid for this month. No EMI left.",
        });
      }

      // Calculate missed installments
      const missedInstallments = Math.max(0, monthsPassed - paidInstallments);
      console.log(missedInstallments, "missedInstallments");

      // Calculate penalty for missed months (₹10 per month)
      let penalty = missedInstallments * 10;

      // Next due EMI date
      const nextDueDate = new Date(scheme.rdNextEmiDate);
      // nextDueDate.setMonth(openingDate.getMonth() + paidInstallments + 1);

      // Add grace period of 7 days
      const graceEndDate = new Date(nextDueDate);
      graceEndDate.setDate(graceEndDate.getDate() + 7);

      let installmentsDue = missedInstallments; // start with only missed ones

      // If current month's EMI due date is already reached (or within grace) → count it too
      if (now >= nextDueDate) {
        installmentsDue += 1;
      }

      // If no missed installments, but EMI is beyond grace → extra penalty
      if (missedInstallments === 0 && now > graceEndDate) {
        penalty += 10;
      }

      console.log(nextDueDate, "nextDueDate");
      const totalPayable = installmentsDue * emiAmount + penalty;

      totalPayableWithoutPenality = installmentsDue * emiAmount

      // Validate payment amount
      if (Number(amount) !== totalPayable) {
        return res.status(400).json({
          success: false,
          message:
            penalty > 0
              ? `You must pay ₹${installmentsDue * emiAmount} + ₹${penalty} penalty = ₹${totalPayable}`
              : `Installment must be exactly ₹${installmentsDue * emiAmount}`,
        });
      }

      // Update RD scheme
      scheme.rdLastEmiDate = now;

      if (penalty > 0) {
        scheme.rdAccountStatus = "irregular";
      }
    }


    // 5. Invalid transaction type
    else {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction type",
      });
    }

    // 6. Save customer updates
    await customer.save();

      
    // 7. Create transaction record
    const transactionId = await generateTransactionId("RD");
    const transaction = await Transaction.create({
      transactionId,
      customerId,
      schemeType: "RD",
      accountNumber: rdAccountNumber,
      transactionType,
      amount: totalPayableWithoutPenality,
      mode,
   installmentNo: (Number(scheme?.rdTotalDepositedInstallment) || 0) + 1,

      agentId: customer.agentId,
      areaManagerId: customer.areaManagerId,
      managerId: customer.managerId,
      remarks,
      status: "pending",
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
      // agentId,
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
      (s) => s.fdAccountNumber === fdAccountNumber
    );

    if (!scheme) {
      return res
        .status(404)
        .json({ success: false, message: "FD scheme not found for customer" });
    }

    if (transactionType === "deposit") {
      // Check if deposit already made
      if (scheme.fdDepositAmount && Number(scheme.fdDepositAmount) > 0) {
        return res.status(400).json({
          success: false,
          message: "FD deposit already made for this scheme",
        });
      }

      const expectedPrincipal = Number(scheme.fdPrincipalAmount || 0);

      // Check deposit amount matches FD principal
      if (Number(amount) !== expectedPrincipal) {
        return res.status(400).json({
          success: false,
          message: `Deposit must be exactly ${expectedPrincipal}`,
        });
      }

      // ✅ Check if customer has enough balance
      if (Number(customer.savingAccountBalance) < Number(amount)) {
        return res.status(400).json({
          success: false,
          message: "Insufficient balance in saving account",
        });
      }

      // Deduct FD amount from saving account (optional here if you want to auto-update)
      // customer.savingAccountBalance = 
      //   Number(customer.savingAccountBalance) - Number(amount);
      // scheme.fdDepositAmount = Number(amount);
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction type",
      });
    }

    // Save updated customer
    await customer.save({ validateBeforeSave: false });

    // Create FD transaction (pending until manager approval)
    const transactionId = await generateTransactionId("FD");
    const transaction = await Transaction.create({
      customerId,
      transactionId,
      managerId: customer.managerId,
      schemeType: "FD",
      accountNumber: fdAccountNumber,
      transactionType,
      amount,
      mode,
      agentId: customer.agentId,
      areaManagerId: customer?.areaManagerId || "",
      status: "accepted",
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



exports.loanEmiTransaction = async (req, res) => {
  try {
    const {
      customerId,
      loanAccountNumber,
      amount,
      mode,

    } = req.body;

    // 1. Find customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }

    // 2. Find loan
    const scheme = customer.loans.find(
      (s) => s.loanAccountNumber === loanAccountNumber
    );

    if (!scheme) {
      return res
        .status(404)
        .json({ success: false, message: "Loan not found for customer" });
    }

    // 3. Check if loan is already closed
    if (scheme.status === "closed") {
      return res.status(400).json({
        success: false,
        message: "This loan account is already closed",
      });
    }

    // 4. Validate EMI amount
    const expectedInstallment = Number(scheme.loanEMIAmount) || 0;
    if (Number(amount) !== expectedInstallment) {
      return res.status(400).json({
        success: false,
        message: `Installment must be exactly ${expectedInstallment}`,
      });
    }

    // 5. Generate transactionId
    const transactionId = await generateTransactionId("LOAN");

    // 6. Update loan details
    // scheme.loanTotalEmiDeposited =
    //   Number(scheme.loanTotalEmiDeposited || 0) + Number(amount);

    // scheme.loanTotalNumberOfEmiDeposited =
    //   Number(scheme.loanTotalNumberOfEmiDeposited || 0) + 1;

    // scheme.loanRemainingEmis =
    //   Number(scheme.loanTotalEmis) - Number(scheme.loanTotalNumberOfEmiDeposited);

    // scheme.loanLastEmiDate = new Date();

    // // Example: next EMI date 30 days later
    // scheme.loanNextEmiDate = new Date();
    // scheme.loanNextEmiDate.setDate(scheme.loanNextEmiDate.getDate() + 30);

    // // ✅ If all EMIs are paid, mark loan closed
    // if (scheme.loanRemainingEmis <= 0) {
    //   scheme.status = "closed";
    //   scheme.loanRemainingEmis = 0;
    //   scheme.loanClosingDate= new Date()
    // }

    // 7. Create transaction record
    const transaction = await Transaction.create({
      transactionId,
      customerId,
      schemeType: "LOAN",
      accountNumber: loanAccountNumber,
      transactionType: "emi",
      amount,
      mode,
      installmentNo: (Number(scheme?.loanTotalNumberOfEmiDeposited) || 0) + 1,
      areaManagerId: customer?.areaManagerId,
      agentId: customer.agentId,
      managerId: customer.managerId,
      // remarks,
      status: "pending", // approval flow
    });

    // 8. Save updated customer
    await customer.save({ validateBeforeSave: false });

    res.status(201).json({
      success: true,
      message: "Loan EMI transaction recorded successfully",
      transaction,
      loan: scheme,
    });
  } catch (err) {
    console.error("Loan Transaction Error:", err);
    res.status(500).json({
      success: false,
      error: "Server Error",
      message: err.message,
    });
  }
};



exports.pigmyEmiTransaction = async (req, res) => {
  try {
    const {
      customerId,
      pigMyAccountNumber,
      amount,
      mode,
      // agentId,
    } = req.body;

    // 1. Find customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }

    // 2. Find pigmy account
    const pigmy = customer.pigmy.find(
      (p) => p.pigMyAccountNumber == pigMyAccountNumber
    );

    if (!pigmy) {
      return res
        .status(404)
        .json({ success: false, message: "Pigmy account not found for customer" });
    }

    // 3. Check if account is already closed
    if (pigmy.pigmyAccount === "closed" || pigmy.pigmyAccount === "matured") {
      return res.status(400).json({
        success: false,
        message: `This pigmy account is already ${pigmy.pigmyAccount} `,
      });
    }

    // 4. Check if maturity date has passed
    // const today = new Date();
    // const maturityDate = new Date(pigmy.pigMyMaturityDate);

    // if (today >= maturityDate) {
    //   pigmy.pigMyAccountStatus = "matured";
    //   await customer.save();

    //   return res.status(400).json({
    //     success: false,
    //     message: "This pigmy account has matured. No more deposits allowed.",
    //     pigmy,
    //   });
    // }

    // 5. Validate daily deposit amount
    const expectedDeposit = Number(pigmy.pigmyDailyDeposit) || 0;
    if (Number(amount) !== expectedDeposit) {
      return res.status(400).json({
        success: false,
        message: `Deposit must be exactly ${expectedDeposit}`,
      });
    }

    // 6. Generate transaction ID
    const transactionId = await generateTransactionId("PIGMY");

    // // 7. Update pigmy account
    // pigmy.pigMyTotalDepositedAmount =
    //   Number(pigmy.pigMyTotalDepositedAmount || 0) + Number(amount);

    // pigmy.pigMyTotalInstallmentDeposited =
    //   Number(pigmy.pigMyTotalInstallmentDeposited || 0) + 1;

    // pigmy.pigMyAccountStatus = "active";

    // 8. Save transaction
    const transaction = await Transaction.create({
      transactionId,
      customerId,
      areaManagerId: customer?.areaManagerId,
      schemeType: "PIGMY",
      accountNumber: pigMyAccountNumber,
      transactionType: "emi",
      amount,
      mode,
      installmentNo: (Number(pigmy?.pigMyTotalInstallmentDeposited) || 0) + 1,


      agentId: customer.agentId,
      managerId: customer.managerId,
      status: "pending", // approval workflow
    });

    // 9. Save updated customer
    await customer.save({ validateBeforeSave: false });

    res.status(201).json({
      success: true,
      message: "Pigmy deposit recorded successfully",
      transaction,
      pigmy,
    });
  } catch (err) {
    console.error("Pigmy Transaction Error:", err);
    res.status(500).json({
      success: false,
      error: "Server Error",
      message: err.message,
    });
  }
};


exports.lakhpatiEmiTransaction = async (req, res) => {
  try {
    const {
      customerId,
      lakhpatiYojanaAccountNumber,
      amount,
      mode,
      // agentId (optional if needed)
    } = req.body;

    // 1. Find customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }

    // 2. Find Lakhpati Yojana account
    const lakhpati = customer.lakhpatiSchemes.find(
      (l) => l.lakhpatiYojanaAccountNumber == lakhpatiYojanaAccountNumber
    );

    if (!lakhpati) {
      return res.status(404).json({
        success: false,
        message: "Lakhpati Yojana account not found for customer",
      });
    }

    // 3. Check if account is already closed or matured
    if (
      lakhpati.lakhpatiYojanaAccountStatus === "closed" ||
      lakhpati.lakhpatiYojanaAccountStatus === "matured"
    ) {
      return res.status(400).json({
        success: false,
        message: `This Lakhpati Yojana account is already ${lakhpati.lakhpatiYojanaAccountStatus}`,
      });
    }

    // 4. Validate installment amount
    const expectedInstallment = Number(lakhpati.lakhpatiYojanaInstallAmount) || 0;
    if (Number(amount) !== expectedInstallment) {
      return res.status(400).json({
        success: false,
        message: `Installment must be exactly ${expectedInstallment}`,
      });
    }

    // 5. Generate transaction ID
    const transactionId = await generateTransactionId("LAKH");

    // // 6. Update Lakhpati account
    // lakhpati.lakhpatiYojanaTotalDepositedAmount =
    //   Number(lakhpati.lakhpatiYojanaTotalDepositedAmount || 0) + Number(amount);

    // lakhpati.lakhpatiYojanaTotalInstallments =
    //   Number(lakhpati.lakhpatiYojanaTotalInstallments || 0);

    const installmentNo =
      (Number(lakhpati.lakhpatiYojanaTotalDepositedInstallments) || 0) + 1;

    // lakhpati.lakhpatiYojanaInstallMentsDone = installmentNo;
    // lakhpati.lakhpatiYojanaAccountStatus = "active";

    // 7. Save transaction
    const transaction = await Transaction.create({
      transactionId,
      customerId,
      areaManagerId: customer?.areaManagerId,
      schemeType: "Lakhpati",
      accountNumber: lakhpatiYojanaAccountNumber,
      transactionType: "emi",
      amount,
      mode,
      installmentNo,
      agentId: customer.agentId,
      managerId: customer.managerId,
      status: "pending", // approval workflow
    });

    // 8. Save updated customer
    await customer.save({ validateBeforeSave: false });

    res.status(201).json({
      success: true,
      message: "Lakhpati EMI recorded successfully",
      transaction,
      lakhpati,
    });
  } catch (err) {
    console.error("Lakhpati Transaction Error:", err);
    res.status(500).json({
      success: false,
      error: "Server Error",
      message: err.message,
    });
  }
};

exports


exports.savingAccountTransaction = async (req, res) => {
  try {
    const {
      customerId,
      transactionType, // "deposit" | "withdrawal"
      amount,
      mode, // cash, upi, bankTransfer, cheque
      remarks,
    } = req.body;

    // 1. Find customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // 2. Validate saving account
    if (!customer.savingAccountNumber) {
      return res.status(404).json({
        success: false,
        message: "Customer does not have a saving account",
      });
    }

    if (customer.savingAccountStatus === "closed") {
      return res.status(400).json({
        success: false,
        message: "Saving account is already closed",
      });
    }

    const txnAmount = Number(amount);
    const currentBalance = Number(customer.savingAccountBalance || 0);
    const withdrawLimit = Number(customer.savingAccountWithdrawLimit || 0);

    // 3. Transaction validation
    if (transactionType === "deposit") {
      if (txnAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Deposit amount must be greater than 0",
        });
      }
    }
    else if (transactionType === "withdrawal") {
      if (txnAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Withdrawal amount must be greater than 0",
        });
      }
      if (txnAmount > currentBalance) {
        return res.status(400).json({
          success: false,
          message: "Insufficient balance",
        });
      }
      if (withdrawLimit > 0 && txnAmount > withdrawLimit) {
        return res.status(400).json({
          success: false,
          message: `Withdrawal exceeds limit of ${withdrawLimit}`,
        });
      }
    }
    else {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction type",
      });
    }

    // 4. Create transaction record (balance not updated yet)
    const transactionId = await generateTransactionId("SAVING");
    const transaction = await Transaction.create({
      transactionId,
      customerId,
      schemeType: "SAVING_ACCOUNT",
      accountNumber: customer.savingAccountNumber,
      transactionType,
      amount: txnAmount,
      mode,
      agentId: customer.agentId,
      areaManagerId: customer.areaManagerId,
      managerId: customer.managerId,
      remarks,
      status: "pending", // balance will be updated on approval
    });

    // 5. Response
    res.status(201).json({
      success: true,
      message: `Saving account ${transactionType} transaction created (pending approval)`,
      data: {
        transaction,
        currentBalance, // unchanged until approval
      },
    });
  } catch (err) {
    console.error("Saving Transaction Error:", err);
    res.status(500).json({
      success: false,
      error: "Server Error",
      message: err.message,
    });
  }
};




exports.getTransaction = async (req, res) => {
  try {
    const {
      filter,
      accountNumber,
      agentId,
      customerId,
      areaManagerId,
      managerId,
      schemeType,
      transactionType,
      status,
      mode,
      search, // ✅ free text search
      fromDate, // ✅ new
      toDate,   // ✅ new
      page = 1,
      limit = 10,
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
    } else if (fromDate && toDate) {
      // ✅ Custom range
      query.createdAt = {
        $gte: moment(fromDate).startOf("day").toDate(),
        $lte: moment(toDate).endOf("day").toDate(),
      };
    } else if (fromDate) {
      // ✅ Only fromDate
      query.createdAt = {
        $gte: moment(fromDate).startOf("day").toDate(),
      };
    } else if (toDate) {
      // ✅ Only toDate
      query.createdAt = {
        $lte: moment(toDate).endOf("day").toDate(),
      };
    }

    // 🔹 Field filters
    if (accountNumber) query.accountNumber = accountNumber;
    if (mode) query.mode = mode;
    if (agentId) query.agentId = agentId;
    if (managerId) query.managerId = managerId;
    if (areaManagerId) query.areaManagerId = areaManagerId;
    if (customerId) query.customerId = customerId;
    if (schemeType) query.schemeType = schemeType;
    if (transactionType) query.transactionType = transactionType;
    if (status) query.status = status;

    // 🔹 Search filter
    if (search) {
      query.$or = [
        { accountNumber: { $regex: search, $options: "i" } },
        // { remarks: { $regex: search, $options: "i" } }, // optional
      ];
    }

    // 🔹 Query DB
    const transactions = await Transaction.find(query)
      .populate("agentId", "name email contact")
      .populate("customerId", "name email contact")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      total,
      totalPages,
      page: Number(page),
      limit: Number(limit),
      transactions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};



exports.getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await Transaction.findById(id)
      .populate("agentId", "name contact address email")
      .populate("customerId", "name contact address email CustomerId savingAccountBalance picture savingAccountNumber")
      .populate("managerId", "name contact email");

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
};

exports.TransactionApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, managerId, remarks } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    if (transaction.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Transaction already processed",
      });
    }

    // ✅ update transaction status
    transaction.status = status;
    transaction.managerId = managerId;
    if (remarks) transaction.remarks = remarks;
    await transaction.save();

    // ✅ Fetch customer for further scheme updates
    const customer = await Customer.findById(transaction.customerId);

    if (customer) {
      switch (transaction.schemeType) {
        // ---------------- FD ----------------
        case "FD": {
          const scheme = customer.fdSchemes.find(
            (s) => s.fdAccountNumber === transaction.accountNumber
          );
          if (scheme) {
            // if (transaction.transactionType === "maturityPayout") {
            //   if (status === "approved") {
            //     scheme.fdAccountStatus = "closed";
            //     scheme.fdCloseDate = new Date();
            //   } else {
            //     scheme.fdAccountStatus = "active";
            //     scheme.fdCloseDate = null;
            //   }
            // } else

            if (transaction.transactionType === "deposit") {
              if (status === "approved") {
                scheme.fdDepositAmount =
                  Number(scheme.fdDepositAmount || 0) + Number(transaction.amount || 0);
                // Deduct FD amount from saving account (optional here if you want to auto-update)
                customer.savingAccountBalance =
                  Number(customer.savingAccountBalance) - Number(transaction.amount);

                scheme.fdAccountStatus = "active";



              }
              // rejected → do nothing
            }
          }
          break;
        }

        // ---------------- RD ----------------
        case "RD": {
          const scheme = customer.rdSchemes.find(
            (s) => s.rdAccountNumber === transaction.accountNumber
          );
          if (scheme) {


            if (transaction.transactionType === "emi") {
              if (status === "approved") {
                scheme.rdTotalDepositedtAmount =
                  (scheme.rdTotalDepositedtAmount || 0) + transaction.amount;
                scheme.rdTotalDepositedInstallment =
                  (scheme.rdTotalDepositedInstallment || 0) + 1;

                // Suppose scheme.rdOpeningDate is saved when RD is created
                if (!scheme.rdNextEmiDate) {
                  // First EMI will be exactly same date of next month from opening date
                  const firstEmi = new Date(scheme.rdOpeningDate);
                  firstEmi.setMonth(firstEmi.getMonth() + 1);
                  scheme.rdNextEmiDate = firstEmi;
                } else {
                  // From the last emi date, go to next month same date
                  const nextDate = new Date(scheme.rdNextEmiDate);
                  nextDate.setMonth(nextDate.getMonth() + 1);
                  scheme.rdNextEmiDate = nextDate;
                }




                if (
                  scheme.rdTotalDepositedtAmount > 0 &&
                  scheme.rdAccountStatus === "pending"
                ) {
                  scheme.rdAccountStatus = "active";
                }

                // 🔹 Check maturity
                if (scheme.rdMaturityDate && new Date(scheme.rdNextEmiDate) > new Date(scheme.rdMaturityDate)) {
                  scheme.rdAccountStatus = "matured";
                }


              }
              // rejected → do nothing
            }
          }
          break;
        }



        case "Lakhpati": {
          const scheme = customer.lakhpatiSchemes.find(
            (s) => s.lakhpatiYojanaAccountNumber === transaction.accountNumber
          );
          if (scheme) {


            if (transaction.transactionType === "emi") {
              if (status === "approved") {
                scheme.lakhpatiYojanaTotalDepositedAmount =
                  (scheme.lakhpatiYojanaTotalDepositedAmount || 0) + transaction.amount;
                scheme.lakhpatiYojanaTotalDepositedInstallments =
                  (scheme.lakhpatiYojanaTotalDepositedInstallments || 0) + 1;

                // Suppose scheme.rdOpeningDate is saved when RD is created
                if (!scheme.lakhpatiYojnaNextEmiDate) {
                  // First EMI date = same day next month from opening date
                  const openingDate = new Date(scheme.lakhpatiYojanaOpeningDate);
                  const day = openingDate.getDate();

                  const firstEmi = new Date(openingDate);
                  firstEmi.setMonth(openingDate.getMonth() + 1);

                  // Ensure EMI day matches the original opening date's day
                  if (firstEmi.getDate() < day) {
                    // Handle cases like Jan 31 -> Feb (28/29 days)
                    firstEmi.setDate(0); // last day of previous month
                  } else {
                    firstEmi.setDate(day);
                  }

                  scheme.lakhpatiYojnaNextEmiDate = firstEmi;
                } else {
                  // Next EMI date based on last EMI but fixed day
                  const lastEmi = new Date(scheme.lakhpatiYojnaNextEmiDate);
                  const openingDate = new Date(scheme.lakhpatiYojanaOpeningDate);
                  const day = openingDate.getDate();

                  const nextEmi = new Date(lastEmi);
                  nextEmi.setMonth(lastEmi.getMonth() + 1);

                  if (nextEmi.getDate() < day) {
                    nextEmi.setDate(0); // fallback to last valid date
                  } else {
                    nextEmi.setDate(day);
                  }

                  scheme.lakhpatiYojnaNextEmiDate = nextEmi;
                }




                if (
                  scheme.lakhpatiYojanaTotalDepositedAmount > 0 &&
                  scheme.lakhpatiYojanaAccountStatus === "pending"
                ) {
                  scheme.lakhpatiYojanaAccountStatus = "active";
                }

                // 🔹 Check maturity
                if (scheme.lakhpatiYojanaMaturityDate && new Date(scheme.lakhpatiYojnaNextEmiDate) > new Date(scheme.lakhpatiYojanaMaturityDate)) {
                  scheme.lakhpatiYojanaAccountStatus = "matured";
                }


              }
              // rejected → do nothing
            }
          }
          break;
        }


        // ---------------- LOAN ----------------
        case "LOAN": {
          const scheme = customer.loans.find(
            (s) => s.loanAccountNumber === transaction.accountNumber
          );
          if (scheme) {
            // if (transaction.transactionType === "disbursement") {
            //   if (status === "approved") {
            //     scheme.loanDisbursed = true;
            //     scheme.loanStatus = "active";
            //   } else {
            //     scheme.loanDisbursed = false;
            //     scheme.loanStatus = "rejected";
            //   }
            // } else

            if (transaction.transactionType === "emi") {
              if (status === "approved") {
                scheme.loanOutstandingAmount =
                  (scheme.loanOutstandingAmount || 0) - transaction.amount;
                scheme.loanTotalNumberOfEmiDeposited =
                  (Number(scheme.loanTotalNumberOfEmiDeposited) || 0) + 1;
                scheme.loanRemainingEmis =
                  (scheme.loanRemainingEmis || 0) - 1;


                // 6. Update loan details
                scheme.loanTotalEmiDeposited =
                  Number(scheme.loanTotalEmiDeposited || 0) + Number(transaction.amount);

                // // Example: next EMI date 30 days later
                const nextDate = new Date();
                nextDate.setDate(nextDate.getDate() + 30);
                scheme.loanNextEmiDate = nextDate;


                // // ✅ If all EMIs are paid, mark loan closed
                if (scheme.loanRemainingEmis <= 0) {
                  scheme.loanStatus = "closed";
                  scheme.loanRemainingEmis = 0;
                  scheme.loanClosingDate = new Date()
                }

              }



              // rejected → do nothing
            }
          }
          break;
        }

        // ---------------- PIGMY ----------------
        case "PIGMY": {
          const scheme = customer.pigmy.find(
            (s) => s.pigMyAccountNumber === transaction.accountNumber
          );
          if (scheme) {
            if (transaction.transactionType === "emi") {
              if (status === "approved") {


                // // 7. Update pigmy account
                scheme.pigMyTotalDepositedAmount =
                  Number(scheme.pigMyTotalDepositedAmount || 0) + Number(transaction.amount);

                scheme.pigMyTotalInstallmentDeposited =
                  Number(scheme.pigMyTotalInstallmentDeposited || 0) + 1;

                scheme.pigmyAccount = "active";

                // 4. Check if maturity date has passed
                const today = new Date();
                const maturityDate = new Date(scheme.pigMyMaturityDate);

                if (today >= maturityDate) {
                  scheme.pigmyAccount = "matured";
                  // await customer.save();


                }

              }
              // rejected → do nothing
              // } else if (transaction.transactionType === "withdrawal") {
              //   if (status === "approved") {
              //     scheme.pigmyTotalDeposited =
              //       (scheme.pigmyTotalDeposited || 0) - transaction.amount;
              //   }
              // rejected → do nothing
            }
          }
          break;
        }

        // ---------------- SAVING ACCOUNT ----------------
        case "SAVING_ACCOUNT": {

          if (customer) {
            if (transaction.transactionType === "deposit") {
              if (status === "approved") {
                customer.savingAccountBalance =
                  Number(customer.savingAccountBalance || 0) + Number(transaction.amount);
                customer.savingAccountStatus = "active";
              }
              // rejected → do nothing
            } else if (transaction.transactionType === "withdrawal") {
              if (status === "approved") {
                if ((customer.savingAccountBalance || 0) >= transaction.amount) {
                  customer.savingAccountBalance =
                    Number(customer.savingAccountBalance || 0) - Number(transaction.amount);
                } else {
                  return res.status(400).json({
                    success: false,
                    message: "Insufficient balance for withdrawal",
                  });
                }
              }
              // rejected → do nothing
            }
          }
          break;
        }

      }

      // save updated customer
      await customer.save({ validateBeforeSave: false });

    }

    res.json({
      success: true,
      message: `Transaction ${status} successfully`,
      data: transaction,
    });
  } catch (error) {
    console.error("TransactionApproval Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};




// #region MIP Payout Function
exports.fdPayout = async (req, res) => {
  try {
    const { customerId, fdAccountNumber } = req.body;

    // 1. Find customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    // 2. Find FD account
    const fdAccount = customer.fdSchemes.find(fd => fd.fdAccountNumber === fdAccountNumber);
    if (!fdAccount) {
      return res.status(404).json({ success: false, message: "FD account not found" });
    }

    if (fdAccount.fdAccountStatus === "closed") {
      return res.status(400).json({ success: false, message: "FD already closed" });
    }

    // 3. Calculate elapsed months
    const openingDate = moment(fdAccount.fdOpeningDate);
    const today = moment();
    const elapsedMonths = today.diff(openingDate, "months");

    const tenureMonths = Number(fdAccount.fdTenureType === "month" ? fdAccount.fdTenure : fdAccount.fdTenure * 12);
    let penaltyRate = 0;

    // 4. Check payout rules based on FD tenure
    switch (tenureMonths) {
      case 9:
      case 12:
        if (elapsedMonths < tenureMonths) {
          return res.status(400).json({ success: false, message: "No premature withdrawal allowed for this FD" });
        }
        break;

      case 24:
        if (elapsedMonths < 12) return res.status(400).json({ success: false, message: "Cannot withdraw before 12 months" });
        penaltyRate = elapsedMonths <= 18 ? 4 : 4.5;
        break;

      case 36:
        if (elapsedMonths < 18) return res.status(400).json({ success: false, message: "Cannot withdraw before 18 months" });
        penaltyRate = elapsedMonths <= 30 ? 4 : 4.5;
        break;

      case 48:
        if (elapsedMonths < 24) return res.status(400).json({ success: false, message: "Cannot withdraw before 24 months" });
        penaltyRate = elapsedMonths <= 42 ? 4 : 4.5;
        break;

      case 84:
        if (elapsedMonths < 42) return res.status(400).json({ success: false, message: "Cannot withdraw before 42 months" });
        penaltyRate = elapsedMonths <= 72 ? 4 : 5;
        break;

      default:
        return res.status(400).json({ success: false, message: "Invalid FD tenure" });
    }

    // 5. Calculate payout amount
    const principal = Number(fdAccount.fdPrincipalAmount);
    const rate = Number(fdAccount.fdInterestRate) / 100;
    const timeYears = elapsedMonths / 12;
    let maturityAmount = principal * Math.pow(1 + rate, timeYears);

    if (penaltyRate > 0) {
      maturityAmount = maturityAmount * (1 - penaltyRate / 100);
    }
    const transactionId = await generateTransactionId("FD");
    // 6. Record transaction
    const transaction = await Transaction.create({
      customerId,
      transactionId,
      schemeType: "FD",
      accountNumber: fdAccountNumber,
      transactionType: "maturityPayout",
      amount: maturityAmount,
      mode: "bankTransfer",
      managerId: customer.managerId,
      status: "approved",
      agentId: customer.agentId,
      areaManagerId: customer?.areaManagerId || "",
    });

    // 7. Update FD status
    fdAccount.fdAccountStatus = "closed";
    fdAccount.fdMaturityAmount = maturityAmount.toFixed(2);
    fdAccount.fdCloseDate = new Date();
    customer.savingAccountBalance = parseFloat(customer.savingAccountBalance) + parseFloat(maturityAmount.toFixed(2));

    await customer.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      message: "FD payout processed successfully",
      data: { maturityAmount: maturityAmount.toFixed(2), transaction },
    });

  } catch (err) {
    console.error("FD Payout Error:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
  }
};


exports.rdPayout = async (req, res) => {
  try {
    const { customerId, rdAccountNumber } = req.body;

    // 1. Find customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    // 2. Find RD account
    const rdAccount = customer.rdSchemes.find(rd => rd.rdAccountNumber === rdAccountNumber);
    if (!rdAccount) {
      return res.status(404).json({ success: false, message: "RD account not found" });
    }

    if (rdAccount.rdAccountStatus === "closed") {
      return res.status(400).json({ success: false, message: "RD already closed" });
    }

    // 3. Calculate elapsed months
    const openingDate = moment(rdAccount.rdOpeningDate);
    const today = moment();
    const elapsedMonths = today.diff(openingDate, "months");
    const tenureMonths = Number(rdAccount.rdTenure);

    let prematureRate = null;

    // 4. Apply RD premature rules
    if ([12, 24].includes(tenureMonths)) {
      if (elapsedMonths < tenureMonths) {
        return res.status(400).json({ success: false, message: "No premature withdrawal allowed for this RD" });
      }
    } else if (tenureMonths === 36) {
      if (elapsedMonths < 18) {
        return res.status(400).json({ success: false, message: "Cannot withdraw before 18 months" });
      }
      prematureRate = 4.25 / 100;
    } else if (tenureMonths === 48) {
      if (elapsedMonths < 24) {
        return res.status(400).json({ success: false, message: "Cannot withdraw before 24 months" });
      }
      prematureRate = 4.5 / 100;
    } else if (tenureMonths === 60) {
      if (elapsedMonths < 30) {
        return res.status(400).json({ success: false, message: "Cannot withdraw before 30 months" });
      }
      prematureRate = 4.75 / 100;
    } else {
      return res.status(400).json({ success: false, message: "Invalid RD tenure" });
    }

    // 5. Calculate payout
    // 5. Calculate payout based on actual deposits
    const monthlyInstallment = Number(rdAccount.rdInstallAmount);
    const depositedAmount = Number(rdAccount.rdTotalDepositedtAmount) || 0;
    const paidMonths = Number(rdAccount.rdTotalDepositedInstallment) || 0;
    const timeYears = paidMonths / 12;
    const rate = rdAccount.rdInterestRate
    const n = 12;
    let maturityAmount = monthlyInstallment *
      ((Math.pow(1 + rate / n, n * timeYears) - 1) / (rate / n));


    if (prematureRate) {
      // Calculate interest on actual deposits (not assumed full months)
      const timeYears = paidMonths / 12; // actual paid months in years
      const n = 12; // compounding monthly

      maturityAmount =
        monthlyInstallment *
        ((Math.pow(1 + prematureRate / n, n * timeYears) - 1) / (prematureRate / n));

      maturityAmount = maturityAmount.toFixed(2);
    }

    const transactionId = await generateTransactionId("RD");

    // 6. Record transaction
    const transaction = await Transaction.create({
      customerId,
      transactionId,
      schemeType: "RD",
      accountNumber: rdAccountNumber,
      transactionType: "maturityPayout",
      amount: maturityAmount,
      mode: "bankTransfer",
      managerId: customer.managerId,
      status: "approved",
      agentId: customer.agentId,
      areaManagerId: customer?.areaManagerId || "",
    });

    // 7. Update RD status
    rdAccount.rdAccountStatus = "closed";
    rdAccount.rdMaturityAmount = maturityAmount.toFixed(2);
    rdAccount.rdCloseDate = new Date();
    customer.savingAccountBalance = parseFloat(customer.savingAccountBalance) + parseFloat(maturityAmount.toFixed(2));

    await customer.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      message: "RD payout processed successfully",
      data: { maturityAmount: maturityAmount.toFixed(2), transaction },
    });

  } catch (err) {
    console.error("RD Payout Error:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
  }
};


exports.pigmyPayout = async (req, res) => {
  try {
    const { customerId, pigMyAccountNumber } = req.body;

    // 1. Find customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    // 2. Find Pigmy account
    const pigmyAccount = customer.pigmy.find(
      (p) => p.pigMyAccountNumber === pigMyAccountNumber
    );
    if (!pigmyAccount) {
      return res.status(404).json({ success: false, message: "Pigmy account not found" });
    }

    if (pigmyAccount.pigmyAccount === "closed") {
      return res.status(400).json({ success: false, message: "Pigmy account already closed" });
    }

    // 3. Calculate elapsed months/days
    const openingDate = moment(pigmyAccount.pigMyOpeningDate);
    const today = moment();
    const elapsedMonths = today.diff(openingDate, "months");
    const elapsedDays = today.diff(openingDate, "days");

    const tenureMonths = Number(pigmyAccount.pigMyTenure);
    const dailyDeposit = Number(pigmyAccount.pigmyDailyDeposit);
    const rate = Number(pigmyAccount.pigMyInterestRate) / 100 || 0.05;

    const principalDeposited = dailyDeposit * elapsedDays;

    let interest = 0;
    let penalty = 0;
    let canWithdraw = true;

    // 4. Apply Pigmy Rules
    if (tenureMonths === 6) {
      if (elapsedDays < 60 || elapsedMonths < 2) {
        canWithdraw = false;
      } else if (elapsedMonths >= 1 && elapsedMonths < 3) {
        penalty = principalDeposited * 0.05;
      } else if (elapsedMonths >= 4 && elapsedMonths < 6) {
        penalty = principalDeposited * 0.02;
      } else if (elapsedMonths >= 6) {
        interest = principalDeposited * rate * (elapsedMonths / 12);
      }
    } else if (tenureMonths === 12) {
      if (elapsedDays < 90 || elapsedMonths < 3) {
        canWithdraw = false;
      } else if (elapsedMonths >= 3 && elapsedMonths < 6) {
        penalty = principalDeposited * 0.06; // 6% service charge
      } else if (elapsedMonths >= 6 && elapsedMonths < 9) {
        penalty = principalDeposited * 0.02; // 2% service charge
      } else if (elapsedMonths >= 9 && elapsedMonths < 12) {
        // No penalty but no interest
        penalty = 0;
      } else if (elapsedMonths >= 12) {
        interest = principalDeposited * rate * (elapsedMonths / 12);
      }
    } else {
      return res.status(400).json({ success: false, message: "Invalid Pigmy tenure" });
    }

    if (!canWithdraw) {
      return res.status(400).json({ success: false, message: "Premature withdrawal not allowed yet" });
    }

    const maturityAmount = principalDeposited + interest - penalty;

    // 5. Record Transaction
    const transactionId = await generateTransactionId("PIGMY");

    const transaction = await Transaction.create({
      customerId,
      transactionId,
      schemeType: "PIGMY",
      accountNumber: pigMyAccountNumber,
      transactionType: "maturityPayout",
      amount: maturityAmount.toFixed(2),
      mode: "bankTransfer",
      managerId: customer.managerId,
      status: "approved",
      agentId: customer.agentId,
      areaManagerId: customer?.areaManagerId || "",
    });

    // 6. Update Pigmy status
    pigmyAccount.pigmyAccount = "closed";
    pigmyAccount.pigMyMaturityAmount = maturityAmount.toFixed(2);
    pigmyAccount.pigMyCloseDate = new Date();

    customer.savingAccountBalance =
      parseFloat(customer.savingAccountBalance) + parseFloat(maturityAmount.toFixed(2));

    await customer.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      message: "Pigmy payout processed successfully",
      data: {
        maturityAmount: maturityAmount.toFixed(2),
        principalDeposited,
        interest,
        penalty,
        transaction,
      },
    });
  } catch (err) {
    console.error("Pigmy Payout Error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message,
    });
  }
};


exports.LakhpatiPayout = async (req, res) => {
  try {
    const { customerId, lakhpatiYojanaAccountNumber } = req.body;

    // 1. Find customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }

    // 2. Find Lakhpati Yojana account
    const lakhpati = customer.lakhpatiSchemes.find(
      (l) => l.lakhpatiYojanaAccountNumber == lakhpatiYojanaAccountNumber
    );

    if (!lakhpati) {
      return res.status(404).json({
        success: false,
        message: "Lakhpati Yojana account not found for customer",
      });
    }

    // 3. Check if account is already closed or matured
    if (
      lakhpati.lakhpatiYojanaAccountStatus === "closed" ||
      lakhpati.lakhpatiYojanaAccountStatus === "matured"
    ) {
      return res.status(400).json({
        success: false,
        message: `This Lakhpati Yojana account is already ${lakhpati.lakhpatiYojanaAccountStatus}`,
      });
    }


    // 4. Verify maturity date
    const today = new Date();
    if (today < new Date(lakhpati.lakhpatiYojanaMaturityDate)) {
      return res.status(400).json({
        success: false,
        message: `This account has not reached maturity yet. Maturity date is ${new Date(
          lakhpati.lakhpatiYojanaMaturityDate
        ).toLocaleDateString()}`,
      });
    }


    lakhpati.lakhpatiYojanaAccountStatus = "closed";
    lakhpati.lakhpatiYojanaCloseDate = new Date();
    customer.savingAccountBalance = parseFloat(customer.savingAccountBalance) + parseFloat(lakhpati.lakhpatiYojanaMaturityAmount.toFixed(2));

    const transactionId = await generateTransactionId("FD");
    const transaction = await Transaction.create({
      customerId,
      transactionId,
      managerId: customer.managerId,
      schemeType: "Lakhpati",
      accountNumber: lakhpatiYojanaAccountNumber,
      transactionType: "maturityPayout",
      amount: lakhpati.lakhpatiYojanaMaturityAmount,
      mode: "bankTransfer",
      agentId: customer.agentId,
      areaManagerId: customer?.areaManagerId || "",
      status: "approved",
    });


    // Save updated customer
    await customer.save();

    return res.status(200).json({
      success: true,
      message: "Lakhpati Yojana matured successfully",
      maturityAmount,
      details: lakhpati,
    });
  } catch (err) {
    console.error("Error in LakhpatiPayout:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.MipPayout = async (req, res) => {
  try {
    const { customerId, mipAccountNumber } = req.body;

    // 1. Find customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    // 2. Find MIP scheme
    const mip = customer.mipSchemes.find(
      (m) => m.mipAccountNumber == mipAccountNumber
    );

    if (!mip) {
      return res.status(404).json({
        success: false,
        message: "MIP account not found for customer",
      });
    }

    // 3. Check if already matured or closed
    if (["closed", "matured"].includes(mip.mipAccountStatus)) {
      return res.status(400).json({
        success: false,
        message: `This MIP account is already ${mip.mipAccountStatus}`,
      });
    }

    // 4. Verify maturity date
    const today = new Date();
    if (today < new Date(mip.mipMaturityDate)) {
      return res.status(400).json({
        success: false,
        message: `This account has not reached maturity yet. Maturity date is ${new Date(
          mip.mipMaturityDate
        ).toLocaleDateString()}`,
      });
    }

    // 5. Calculate maturity payout (principal only, since monthly interest is already paid)
    const maturityAmount = parseFloat(mip.mipDepositAmount || 0);

    // 6. Update scheme
    mip.mipMaturityAmount = maturityAmount;
    customer.savingAccountBalance = parseFloat(customer.savingAccountBalance) + parseFloat(maturityAmount.toFixed(2));
    mip.mipAccountStatus = "matured";
    mip.mipCloseDate = today;

    const transactionId = await generateTransactionId("MIP");
    const transaction = await Transaction.create({
      customerId,
      transactionId,
      managerId: customer.managerId,
      schemeType: "MIP",
      accountNumber: mipAccountNumber,
      transactionType: "maturityPayout",
      amount: maturityAmount,
      mode: "bankTransfer",
      agentId: customer.agentId,
      areaManagerId: customer?.areaManagerId || "",
      status: "approved",
    });


    await customer.save();

    return res.status(200).json({
      success: true,
      message: "MIP matured successfully. Principal returned to customer.",
      maturityAmount,
      details: mip,
    });
  } catch (err) {
    console.error("Error in MipPayout:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

