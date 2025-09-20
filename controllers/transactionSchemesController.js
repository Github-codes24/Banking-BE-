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
      agentId,
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

    // 3. Block if RD is closed
    if (scheme.rdAccountStatus === "closed" || scheme.rdAccountStatus === "matured") {
      return res.status(400).json({
        success: false,
        message: `This RD scheme is already ${scheme.rdAccountStatus}`,
      });
    }

    const now = new Date();

    // 4. Handle EMI deposit
    if (transactionType === "emi") {
      const expectedInstallment = Number(scheme.rdInstallAmount) || 0;

      if (Number(amount) !== expectedInstallment) {
        return res.status(400).json({
          success: false,
          message: `Installment must be exactly ${expectedInstallment}`,
        });
      }

      // 🔹 Update RD scheme deposit tracking
      // scheme.rdTotalDepositedtAmount =
      //   Number(scheme.rdTotalDepositedtAmount || 0) + Number(amount);

      // scheme.rdTotalDepositedInstallment =
      //   Number(scheme.rdTotalDepositedInstallment || 0) + 1;

      // scheme.rdLastEmiDate = now;

      // 🔹 Calculate next EMI date
      // if (!scheme.rdNextEmiDate) {
      //   scheme.rdNextEmiDate = new Date(now);
      // }

      // const nextDate = new Date(scheme.rdNextEmiDate);
      // nextDate.setMonth(nextDate.getMonth() + 1); // assuming monthly RD
      // scheme.rdNextEmiDate = nextDate;

      // // 🔹 Check maturity
      // if (scheme.rdMaturityDate && new Date(scheme.rdNextEmiDate) > new Date(scheme.rdMaturityDate)) {
      //   scheme.rdAccountStatus = "matured";
      // }
    }

    // 5. Invalid transaction type
    else {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction type",
      });
    }

    // 6. Save customer updates
    // await customer.save();

    // 7. Create transaction record
    const transactionId = await generateTransactionId("RD");
    const transaction = await Transaction.create({
      transactionId,
      customerId,
      schemeType: "RD",
      accountNumber: rdAccountNumber,
      transactionType,
      amount,
      mode,
      installmentNo: scheme.rdTotalDepositedInstallment + 1 || 0,
      agentId,
      managerId: customer.managerId,
      remarks,
      status: "pending", // approval flow
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
      (s) => s.fdAccountNumber == fdAccountNumber
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




    }



    // else if (transactionType === "maturityPayout") {
    //   const now = new Date();

    //   if (!scheme.fdMaturityDate || new Date(scheme.fdMaturityDate) > now) {
    //     return res.status(400).json({
    //       success: false,
    //       message: "FD scheme has not matured yet",
    //     });
    //   }

    //   if (scheme.fdAccountStatus === "closed") {
    //     return res.status(400).json({
    //       success: false,
    //       message: "FD scheme already closed",
    //     });
    //   }


    //   payoutAmount = Number(scheme.fdMaturityAmount) || 0;

    //   if (payoutAmount <= 0) {
    //     return res.status(400).json({
    //       success: false,
    //       message: "Invalid maturity amount",
    //     });
    //   }


    //   scheme.fdAccountStatus = "closed";
    // }



    else {
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



exports.loanEmiTransaction = async (req, res) => {
  try {
    const {
      customerId,
      loanAccountNumber,
      amount,
      mode,
      agentId,
      // remarks,
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
      installmentNo: scheme.loanTotalNumberOfEmiDeposited,
      agentId,
      managerId: customer.managerId,
      // remarks,
      status: "pending", // approval flow
    });

    // 8. Save updated customer
    await customer.save();

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
      agentId,
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
    if (pigmy.pigMyAccountStatus === "closed" || pigmy.pigMyAccountStatus === "matured") {
      return res.status(400).json({
        success: false,
        message: `This pigmy account is already ${pigmy.pigMyAccountStatus} `,
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
      schemeType: "PIGMY",
      accountNumber: pigMyAccountNumber,
      transactionType: "emi",
      amount,
      mode,
      installmentNo: pigmy.pigMyTotalInstallmentDeposited + 1,
      agentId,
      managerId: customer.managerId,
      status: "pending", // approval workflow
    });

    // 9. Save updated customer
    await customer.save();

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


exports.savingAccountTransaction = async (req, res) => {
  try {
    const {
      customerId,
      transactionType, // "deposit" | "withdrawal"
      amount,
      mode, // cash, upi, bankTransfer, cheque
      agentId,
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

    let currentBalance = Number(customer.savingAccountBalance || 0);
    const withdrawLimit = Number(customer.savingAccountWithdrawLimit || 0);
    const txnAmount = Number(amount);

    // 3. Handle deposit
    if (transactionType === "deposit") {
      currentBalance += txnAmount;
    }

    // 4. Handle withdrawal
    else if (transactionType === "withdrawal") {
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

      currentBalance -= txnAmount;
    }

    // 5. Invalid type
    else {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction type",
      });
    }

    // 6. Update account balance
    customer.savingAccountBalance = String(currentBalance);

    // 7. Save customer
    await customer.save();

    // 8. Create transaction record
    const transactionId = await generateTransactionId("SAVING");
    const transaction = await TransactionSchemes.create({
      transactionId,
      customerId,
      schemeType: "SAVING",
      accountNumber: customer.savingAccountNumber,
      transactionType,
      amount: txnAmount,
      mode,
      agentId,
      managerId: customer.managerId,
      remarks,
      status: "pending", // approval flow
    });

    // 9. Response
    res.status(201).json({
      success: true,
      message: "Saving account transaction recorded successfully",
      data: {
        transaction,
        newBalance: currentBalance,
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
      managerId,
      schemeType,
      transactionType,
      status,
      search, // ✅ new
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
    }

    // 🔹 Field filters
    if (accountNumber) query.accountNumber = accountNumber;
    if (agentId) query.agentId = agentId;
    if (managerId) query.managerId = managerId;
    if (customerId) query.customerId = customerId;
    if (schemeType) query.schemeType = schemeType;
    if (transactionType) query.transactionType = transactionType;
    if (status) query.status = status;

    // 🔹 Search filter (by account number, agent name, customer name)
    if (search) {
      query.$or = [
        { accountNumber: { $regex: search, $options: "i" } },
        // { remarks: { $regex: search, $options: "i" } },
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
      .populate("customerId", "name contact address email")
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
            // if (transaction.transactionType === "maturityPayout") {
            //   if (status === "approved") {
            //     scheme.rdAccountStatus = "closed";
            //     scheme.rdCloseDate = new Date();
            //   } else {
            //     scheme.rdAccountStatus = "active";
            //     scheme.rdCloseDate = null;
            //   }
            // } else

            if (transaction.transactionType === "emi") {
              if (status === "approved") {
                scheme.rdTotalDepositedtAmount =
                  (scheme.rdTotalDepositedtAmount || 0) + transaction.amount;
                scheme.rdTotalDepositedInstallment =
                  (scheme.rdTotalDepositedInstallment || 0) + 1;

                // 🔹 Calculate next EMI date
                if (!scheme.rdNextEmiDate) {
                  scheme.rdNextEmiDate = new Date();
                }

                const nextDate = new Date(scheme.rdNextEmiDate);
                nextDate.setMonth(nextDate.getMonth() + 1); // assuming monthly RD
                scheme.rdNextEmiDate = nextDate;



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
                scheme.loanNextEmiDate = new Date();
                scheme.loanNextEmiDate.setDate(scheme.loanNextEmiDate.getDate() + 30);

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

                scheme.pigMyAccountStatus = "active";

                // 4. Check if maturity date has passed
                const today = new Date();
                const maturityDate = new Date(scheme.pigMyMaturityDate);

                if (today >= maturityDate) {
                  scheme.pigMyAccountStatus = "matured";
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

