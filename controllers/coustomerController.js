const Customer = require("../models/coustomerModel");
const Agent = require("../models/agentModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const otpGenerator = require("otp-generator");
const mongoose = require("mongoose")
const uploadToCloudinary = require("../utils/cloudinary");
const moment = require("moment");



exports.getCustomers = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const {
      fromDate,
      toDate,
      search,
      branch,
      schemeType,
      managerId,
      agentId,
      areaManagerId,
      all, // ✅ new param
    } = req.query;

    const filter = {};

    // 🔹 Date filter
    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate && !isNaN(new Date(fromDate))) {
        filter.createdAt.$gte = new Date(fromDate);
      }
      if (toDate && !isNaN(new Date(toDate))) {
        filter.createdAt.$lte = new Date(toDate);
      }
    }

    // 🔹 Search (name or contact)
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { contact: { $regex: search, $options: "i" } },
      ];
    }

    // 🔹 Branch filter
    if (branch && mongoose.Types.ObjectId.isValid(branch)) {
      filter.branch = branch;
    }

    // 🔹 Scheme type filter
    if (schemeType && mongoose.Types.ObjectId.isValid(schemeType)) {
      filter["schemes.type"] = schemeType;
    }

    // 🔹 Manager filter
    if (managerId && mongoose.Types.ObjectId.isValid(managerId)) {
      filter.managerId = managerId;
    }

    // 🔹 Agent filter
    if (agentId && mongoose.Types.ObjectId.isValid(agentId)) {
      filter.agentId = agentId;
    }

    // 🔹 Area Manager filter
    if (areaManagerId && mongoose.Types.ObjectId.isValid(areaManagerId)) {
      filter.areaManagerId = areaManagerId;
    }

    const total = await Customer.countDocuments(filter);

    let query = Customer.find(filter)
      .sort({ createdAt: -1 })
      .populate("branch", "name")
      .populate("managerId", "name")
      .populate("agentId", "name")
      .populate("areaManagerId", "name");

    // ✅ If all=true → return all customers without pagination
    if (all === "true") {
      const customers = await query;
      return res.status(200).json({
        success: true,
        count: customers.length,
        pagination: {
          totalItems: total,
          currentPage: null,
          totalPages: 1,
        },
        data: customers,
      });
    }

    // ✅ Paginated result
    const customers = await query.skip((page - 1) * limit).limit(limit);

    res.status(200).json({
      success: true,
      count: customers.length,
      pagination: {
        currentPage: page,
        limit,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
      data: customers,
    });
  } catch (err) {
    console.error("Error fetching customers:", err);
    res.status(500).json({
      success: false,
      error: "Server Error",
      message: err.message,
    });
  }
};

exports.getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
      .populate("agentId", "name email contact") // 👈 populate agent details
      .populate("managerId", "name email contact") // 👈 populate agent details
      .populate("areaManagerId", "name email contact") // 👈 populate agent details
      .exec();

    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};


exports.createCustomer = async (req, res) => {
  try {
    const { password, agentId } = req.body;

    // ✅ Check if agent exists
    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res.status(404).json({ success: false, error: "Agent not found" });
    }


    let signature;

if (req.file) {
  try {
    const upload = await uploadToCloudinary(req.file.path, req.file.originalname);
    signature = upload?.url; // Cloudinary usually returns `secure_url`
    req.body.signature = signature;
  } catch (error) {
    console.error("Cloudinary upload failed:", error);
    return res.status(500).json({ message: "File upload failed" });
  }
}


    // Attach branch & manager info from Agent
    req.body.branch = agent.branch;
    req.body.managerId = agent.managerId;
    req.body.areaManagerId = agent.areaManagerId;

    // ✅ Generate unique 8-digit CustomerId
    const lastCustomer = await Customer.findOne().sort({ createdAt: -1 });
    let nextCustomerNumber = 10000000; // start from 8 digits (10000000)
    if (lastCustomer && lastCustomer.CustomerId) {
      const lastNum = parseInt(lastCustomer.CustomerId, 10);
      nextCustomerNumber = lastNum + 1;
    }
    req.body.CustomerId = String(nextCustomerNumber).padStart(8, "0");

    // ✅ Generate unique 8-digit Saving Account Number
    const lastAccount = await Customer.findOne().sort({ createdAt: -1 });
    let nextAccountNumber = 20000000; // start from 20000000
    if (lastAccount && lastAccount.savingAccountNumber) {
      const lastAccNum = parseInt(lastAccount.savingAccountNumber, 10);
      nextAccountNumber = lastAccNum + 1;
    }
    req.body.savingAccountNumber = String(nextAccountNumber).padStart(8, "0");

    // Other Saving Account defaults
    req.body.savingAccountOpeningDate = new Date();
    req.body.savingAccountInterestRate = 4.0; // %
    req.body.savingAccountWithdrawLimit = 25000; // monthly limit
    req.body.savingAccountStatus = "active";

    // ✅ Hash password if provided
    if (!password) {
      return res
        .status(400)
        .json({ success: false, error: "Password is required" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    req.body.password = hashedPassword;

    // ✅ Create Customer
    const customer = await Customer.create(req.body);

    res.status(201).json({ success: true, data: customer });
  } catch (err) {
    console.error("Error creating customer:", err);
    res.status(500).json({ success: false, error: "Server Error" });
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    const { agentId, password } = req.body;

    // ✅ Check if agent exists (if agentId provided)
    if (agentId) {
      const agent = await Agent.findById(agentId);
      if (!agent) {
        return res
          .status(404)
          .json({ success: false, error: "Agent not found" });
      }
      req.body.branch = agent.branch;
      req.body.managerId = agent.managerId;
      req.body.areaManagerId = agent.areaManagerId;
    }

    // ✅ Hash password if updating
    if (password) {
      req.body.password = await bcrypt.hash(password, 10);
    }

    let signature;

if (req.file) {
  try {
    const upload = await uploadToCloudinary(req.file.path, req.file.originalname);
    signature = upload?.url; // Cloudinary usually returns `secure_url`
    req.body.signature = signature;
  } catch (error) {
    console.error("Cloudinary upload failed:", error);
    return res.status(500).json({ message: "File upload failed" });
  }
}


    // ✅ Update customer
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true

    }).select("-password"); // don’t return password in response

    if (!customer) {
      return res
        .status(404)
        .json({ success: false, error: "No customer found" });
    }

    res.status(200).json({ success: true, data: customer });
  } catch (err) {
    console.error("Error in updateCustomer:", err);
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((val) => val.message);
      return res.status(400).json({ success: false, error: messages });
    }
    res.status(500).json({ success: false, error: "Server Error" });
  }
};

exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) {
      return res
        .status(404)
        .json({ success: false, error: "No customer found" });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(500).json({ success: false, error: "Server Error" });
  }
};

exports.loginCustomerByCoustomerId = async (req, res) => {
  try {
    const { CustomerId, password } = req.body; // identifier = email or contact

    if (!CustomerId || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide coustomerId and password",
      });
    }

    // Find customer by email OR contact
    const customer = await Customer.findOne({
      CustomerId,
    }).select(-"password");

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, customer.password || "");
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: customer._id, role: "customer" },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      data: customer,
    });
  } catch (err) {
    console.error("Error in loginCustomer:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.loginCustomerByMpin = async (req, res) => {
  try {
    const { CustomerId, Mpin } = req.body;

    if (!CustomerId || !Mpin) {
      return res.status(400).json({
        success: false,
        message: "Please provide CustomerId and MPIN",
      });
    }

    // Find customer
    const customer = await Customer.findOne({ CustomerId });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Compare MPIN
    const isMatch = await bcrypt.compare(Mpin, customer.Mpin || "");
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid MPIN",
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: customer._id, role: "customer" },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      data: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        contact: customer.contact,
        CustomerId: customer.CustomerId,
      },
    });
  } catch (err) {
    console.error("Error in loginCustomerByMpin:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.sendOtp = async (req, res) => {
  try {
    const { CustomerId } = req.body;

    if (!CustomerId) {
      return res
        .status(400)
        .json({ success: false, message: "CustomerId number is required" });
    }

    // Check if customer exists
    const customer = await Customer.findOne({ CustomerId });
    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }

    // Generate 6-digit OTP
    const otp = otpGenerator.generate(6, {
      digits: true,
      alphabets: false,
      upperCase: false,
      specialChars: false,
    });

    // Save OTP with expiry
    customer.otp = otp;
    customer.otpExpiry = Date.now() + 5 * 60 * 1000; // 5 min
    customer.isOtpVerified = false;
    await customer.save();

    // Send OTP
    // await sendSms(mobile, `Your OTP is ${otp}`);

    res
      .status(200)
      .json({ success: true, otp, message: "OTP sent successfully" });
  } catch (err) {
    console.error("Send OTP error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error while sending OTP" });
  }
};
exports.verifyOtp = async (req, res) => {
  try {
    const { CustomerId, otp } = req.body;

    const customer = await Customer.findOne({ CustomerId });
    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }

    if (customer.otp !== otp || Date.now() > customer.otpExpiry) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired OTP" });
    }

    // Mark verified
    customer.isOtpVerified = true;
    customer.otp = undefined;
    customer.otpExpiry = undefined;
    await customer.save();

    res
      .status(200)
      .json({ success: true, message: "OTP verified successfully" });
  } catch (err) {
    console.error("Verify OTP error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error while verifying OTP" });
  }
};

exports.createMpin = async (req, res) => {
  try {
    const { CustomerId, mpin } = req.body;

    const customer = await Customer.findOne({ CustomerId });
    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }

    // Ensure OTP verified first
    if (!customer.isOtpVerified) {
      return res.status(400).json({
        success: false,
        message: "Please verify OTP before setting MPIN",
      });
    }

    // Hash MPIN
    const hashedMpin = await bcrypt.hash(mpin, 10);
    customer.Mpin = hashedMpin;
    customer.isOtpVerified = false; // reset after use
    await customer.save();

    res
      .status(200)
      .json({ success: true, message: "MPIN created successfully" });
  } catch (err) {
    console.error("Create MPIN error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error while creating MPIN" });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { CustomerId, newPassword } = req.body;

    const customer = await Customer.findOne({ CustomerId });
    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }

    // Ensure OTP verified first
    if (!customer.isOtpVerified) {
      return res.status(400).json({
        success: false,
        message: "Please verify OTP before setting password",
      });
    }

    // Hash MPIN
    const hashedPass = await bcrypt.hash(newPassword, 10);
    customer.password = hashedPass;
    customer.isOtpVerified = false; // reset after use
    await customer.save();

    res
      .status(200)
      .json({ success: true, message: "password updated successfully" });
  } catch (err) {
    console.error("Create password error:", err);
    res.status(500).json({
      success: false,
      message: "Server error while creating password",
    });
  }
};

// const moment = require("moment");

exports.createFD = async (req, res) => {
  try {
    const { customerId } = req.params; // pass CustomerId in URL (not _id)
    const {
      type,
      fdDepositAmount,
   
      fdTenure,
      fdTenureType, // "month", "year", or "day"
      fdMaturityInstruction, // autoRenewal, payout, renewPrincipalOnly
    } = req.body;

    // ✅ Find customer by CustomerId
    const customer = await Customer.findOne({ CustomerId: customerId });
    if (!customer) {
      return res
        .status(404)
        .json({ success: false, error: "Customer not found" });
    }

    // ✅ Generate unique FD account number
    const fdAccountNumber = "FD" + Date.now();

    // ✅ Opening Date
    const openingDate = new Date();

    // ✅ Calculate maturity date
    let maturityDate = moment(openingDate);
    if (fdTenureType === "year") {
      maturityDate = maturityDate.add(Number(fdTenure), "years");
    } else if (fdTenureType === "month") {
      maturityDate = maturityDate.add(Number(fdTenure), "months");
    } else {
      maturityDate = maturityDate.add(Number(fdTenure), "days");
    }

    // ✅ Calculate maturity amount (compound annually)
    const principal = Number(fdDepositAmount);
    const rate = Number(process.env.FD_INTREST_RATE || 6) / 100;
    const time =
      fdTenureType === "year"
        ? Number(fdTenure)
        : fdTenureType === "month"
          ? Number(fdTenure) / 12
          : Number(fdTenure) / 365;

    const maturityAmount = principal * Math.pow(1 + rate, time);

    // ✅ Create FD object
    const fdScheme = {
      type,
      savingAccountNo:customer.savingAccountNumber,
      fdAccountNumber,
      fdOpeningDate: openingDate,
      fdPrincipalAmount: principal,
      fdDepositAmount: 0,
      fdInterestRate: process.env.FD_INTREST_RATE || 6,
      fdTenure,
      fdTenureType,
      fdMaturityDate: maturityDate.toDate(),
      fdMaturityAmount: maturityAmount.toFixed(2),
      fdMaturityInstruction,
      fdAccountStatus: "pending",
    };

    // ✅ Push to fdSchemes array
    customer.fdSchemes.push(fdScheme);
   await customer.save({ validateBeforeSave: false });


    res.status(201).json({
      success: true,
      message: "FD account created successfully",
      data: fdScheme,
    });
  } catch (err) {
    console.error("Error creating FD:", err);
    res
      .status(500)
      .json({ success: false, error: "Server Error: " + err.message });
  }
};

exports.createRD = async (req, res) => {
  try {
    const { customerId } = req.params; // pass customerId in URL
    const {  rdTenure, type, rdInstallAmount } = req.body;

    // ✅ Find customer
    const customer = await Customer.findOne({ CustomerId: customerId });
    if (!customer) {
      return res
        .status(404)
        .json({ success: false, error: "Customer not found" });
    }

    // ✅ Generate unique RD account number
    const rdAccountNumber = "RD" + Date.now();

    // ✅ Opening Date
    const openingDate = new Date();

    // ✅ Calculate maturity date (monthly installments only for now)
    let maturityDate = moment(openingDate).add(Number(rdTenure), "months");

    // ✅ Calculate total deposited amount
    // const totalDeposited = Number(rdInstallAmount) * Number(rdTotalInstallments);

    // ✅ Calculate maturity amount (using simple compounding approx.)
    const rate = Number(process.env.RD_INTREST_RATE || 6) / 100;
    const timeYears = Number(rdTenure) / 12; // convert tenure in months to years

    // Future Value of RD (compound monthly) formula:
    // FV = P * [((1 + r/n)^(n*t) - 1) / (1 - (1 + r/n)^(-1))]
    // Simplified approximation for monthly deposits:
    const n = 12; // monthly compounding
    const P = Number(rdInstallAmount);

    const maturityAmount =
      P *
      ((Math.pow(1 + rate / n, n * timeYears) - 1) / (rate / n)) *
      (1 + rate / n);

    // ✅ Create RD object
    const rdScheme = {
      rdAccountNumber,
      rdOpeningDate: openingDate,
      rdMaturityDate: maturityDate.toDate(),
      rdTenure,
      rdTenureType: "month",
      rdInterestRate: process.env.RD_INTREST_RATE || 6,
      rdInstallAmount: P,
      savingAccountNo:customer.savingAccountNumber,
      type,
      rdTotalDepositedInstallment: 0,
      rdInstallMentsFrequency: "monthly",
      rdTotalDepositedtAmount: 0,
      rdTotalInstallments: rdTenure,
      rdMaturityAmount: maturityAmount.toFixed(2),
      rdAccountStatus: "pending",
    };

    // ✅ Push to rdSchemes array
    customer.rdSchemes.push(rdScheme);
    await customer.save({ validateBeforeSave: false });

    res.status(201).json({
      success: true,
      message: "RD account created successfully",
      data: rdScheme,
    });
  } catch (err) {
    console.error("Error creating RD:", err);
    res
      .status(500)
      .json({ success: false, error: "Server Error: " + err.message });
  }
};




exports.createLoan = async (req, res) => {
  try {
    const { customerId } = req.params; // pass customerId in URL

    // ✅ Find customer
    const customer = await Customer.findOne({ CustomerId: customerId });
    if (!customer) {
      return res
        .status(404)
        .json({ success: false, error: "Customer not found" });
    }

    const { loanPrincipalAmount, loanType, loanTenure, loanTenureType, loanEMIFrequency } = req.body;

    if (!loanPrincipalAmount || !loanTenure || !loanType || !loanTenureType || !loanEMIFrequency) {
      return res.status(400).json({ success: false, message: "Required fields missing" });
    }

    // 1. Calculate total number of EMIs based on tenure type and frequency
    let totalEmisCount;
    switch (loanTenureType) {
      case "year":
        totalEmisCount =
          loanTenure *
          (loanEMIFrequency === "monthly" ? 12 : loanEMIFrequency === "quarterly" ? 4 : 1);
        break;
      case "month":
        totalEmisCount =
          loanTenure *
          (loanEMIFrequency === "monthly"
            ? 1
            : loanEMIFrequency === "quarterly"
              ? 1 / 3
              : 1 / 12);
        break;
      case "week":
        // Assuming 4 weeks per month
        totalEmisCount =
          loanTenure *
          (loanEMIFrequency === "monthly"
            ? 4
            : loanEMIFrequency === "quarterly"
              ? 13
              : 52);
        break;
      default:
        totalEmisCount = Number(loanTenure);
    }
    totalEmisCount = Math.round(totalEmisCount);

    // 2. Calculate estimated EMI amount using a simple interest formula
    const assumedInterestRate = 10; // Annual interest rate in percent (example)
    const principal = parseFloat(loanPrincipalAmount);
    const tenureInYears =
      loanTenureType === "year"
        ? loanTenure
        : loanTenureType === "month"
          ? loanTenure / 12
          : loanTenure / 52;
    const totalInterest = (principal * assumedInterestRate * tenureInYears) / 100;
    const totalAmount = principal + totalInterest;
    const emiAmount = totalAmount / totalEmisCount;

    // 3. Set dates - opening and disbursement dates as today, no EMIs paid yet
    const today = new Date();

    // 4. Calculate next EMI date
    let nextEmiDate = new Date(today);
    switch (loanEMIFrequency) {
      case "monthly":
        nextEmiDate.setMonth(nextEmiDate.getMonth() + 1);
        break;
      case "quarterly":
        nextEmiDate.setMonth(nextEmiDate.getMonth() + 3);
        break;
      case "yearly":
        nextEmiDate.setFullYear(nextEmiDate.getFullYear() + 1);
        break;
    }

    // 5. Calculate last EMI date
    let lastEmiDate = new Date(today);
    switch (loanEMIFrequency) {
      case "monthly":
        lastEmiDate.setMonth(lastEmiDate.getMonth() + (totalEmisCount - 1));
        break;
      case "quarterly":
        lastEmiDate.setMonth(lastEmiDate.getMonth() + (totalEmisCount - 1) * 3);
        break;
      case "yearly":
        lastEmiDate.setFullYear(lastEmiDate.getFullYear() + (totalEmisCount - 1));
        break;
      case "weekly":
        lastEmiDate.setDate(lastEmiDate.getDate() + (totalEmisCount - 1) * 7);
        break;
      case "daily":
        lastEmiDate.setDate(lastEmiDate.getDate() + (totalEmisCount - 1));
        break;
      default:
        lastEmiDate = today;
    }

    // 6. Compose new Loan object
    const newLoan = {
      loanAccountNumber: `LN${Date.now()}`,
      loanOpeningDate: today,
      loanPrincipalAmount: loanPrincipalAmount.toString(),
      loanDisbursementDate: today,
      loanOutstandingAmount: totalAmount,
      loanEMIAmount: Math.round(emiAmount * 100) / 100,
      loanEMIFrequency,
      loanTotalEmiDeposited: "0",
      loanTotalNumberOfEmiDeposited: "0",
      loanInterestRate: assumedInterestRate.toString(),
      loanType: loanType || "personal",
      loanStatus: "active",
      loanTenure: loanTenure.toString(),
      loanTenureType,
      loanRemainingEmis: totalEmisCount,
      loanTotalEmis: totalEmisCount.toString(),
      loanLastEmiDate: lastEmiDate,
      loanNextEmiDate: nextEmiDate,
      loanDisbursed: true,
    };

    customer.loans.push(newLoan);
    await customer.save({validateBeforeSave:false});

    res.status(201).json({
      success: true,
      message: "Loan created successfully with calculated fields",
      loan: newLoan,
    });
  } catch (err) {
    console.error("createLoan error", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


exports.createPigmy = async (req, res) => {
  try {
    const {
      type,
      pigmyDailyDeposit,
      pigMyTenure,
      pigMyTenureType, // "month", "year", "week"
      // Optional: allow override, else set default
    } = req.body;



    const { customerId } = req.params; // pass customerId in URL


    // ✅ Find customer
    const customer = await Customer.findOne({ CustomerId: customerId });
    if (!customer) {
      return res
        .status(404)
        .json({ success: false, error: "Customer not found" });
    }


    const pigMyInterestRate = 8

    if (!pigmyDailyDeposit || !type || !pigMyTenure || !pigMyTenureType) {
      return res.status(400).json({
        success: false,
        message: "type, pigmyDailyDeposit, pigMyTenure, and pigMyTenureType are required",
      });
    }

    // Parse values with defaults and safety
    const tenure = parseInt(pigMyTenure, 10);
    if (isNaN(tenure) || tenure <= 0) {
      return res.status(400).json({ success: false, message: "Invalid tenure value" });
    }

    let tenureMonths;
    switch (pigMyTenureType) {
      case "month":
        tenureMonths = tenure;
        break;
      case "year":
        tenureMonths = tenure * 12;
        break;
      case "week":
        tenureMonths = tenure * (12 / 52); // 1 year = 52 weeks, scale to months
        break;
      default:
        return res.status(400).json({ success: false, message: "Invalid tenure type" });
    }

    const today = new Date();
    const maturityDate = new Date(today);
    maturityDate.setMonth(maturityDate.getMonth() + Math.round(tenureMonths));

    // Calculate total installments: daily deposit means 30 days approx per month, else scale accordingly
    let totalInstallments;
    if (pigMyTenureType === "week") {
      totalInstallments = tenure * 7; // weeks × 7 days
    } else {
      totalInstallments = Math.round(tenureMonths * 30); // months × 30 days
    }

    const depositAmount = parseFloat(pigmyDailyDeposit);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid daily deposit value" });
    }

    const totalDepositedAmount = depositAmount * totalInstallments;

    // Interest rate, fallback on default if not passed
    const interestRate = pigMyInterestRate
      ? parseFloat(pigMyInterestRate)
      : 6.0;
    if (isNaN(interestRate) || interestRate < 0) {
      return res.status(400).json({ success: false, message: "Invalid interest rate" });
    }

    const timeYears = tenureMonths / 12;
    const interestAmount = (totalDepositedAmount * interestRate * timeYears) / 100;
    const maturityAmount = totalDepositedAmount + interestAmount;

    // Generate account number
    const pigmyAccountNumber = `PGMY${Date.now()}`;

    // Build Pigmy object
    const newPigmy = {
      type,
      pigMyAccountNumber: pigmyAccountNumber,
      pigMyOpeningDate: today,
      pigMyTenure: pigMyTenure,
      pigMyTenureType: pigMyTenureType,
      pigMyMaturityDate: maturityDate,
      pigMyInterestRate: interestRate.toString(),
      pigMyTotalDepositedAmount: "0",
      pigMyTotalInstallmentDeposited: "0",
      pigmyDailyDeposit: pigmyDailyDeposit.toString(),
      pigMyMaturityAmount: maturityAmount.toFixed(2).toString(),
      pigMyAccountStatus: "pending",
    };
    customer.pigmy.push(newPigmy)
    await customer.save({validateBeforeSave:false});

    res.status(201).json({
      success: true,
      message: "Pigmy account created successfully",
      pigmy: newPigmy,
    });
  } catch (err) {
    console.error("createPigmy error", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


exports.emiCalculator = async (req, res) => {
  try {
    const { principal, annualRate, tenureMonths } = req.body;

    if (!principal || !annualRate || !tenureMonths) {
      return res.status(400).json({
        success: false,
        error: "Please provide principal, annualRate, and tenureMonths",
      });
    }

    // Convert annual interest to monthly rate
    const r = annualRate / 12 / 100;
    const n = tenureMonths;
    const P = principal;

    // EMI Formula
    const emi =
      (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

    // Total Payable
    const totalPayment = emi * n;
    const totalInterest = totalPayment - P;

    res.status(200).json({
      success: true,
      principal: P,
      annualRate,
      tenureMonths,
      emi: emi.toFixed(2),
      totalInterest: totalInterest.toFixed(2),
      totalPayment: totalPayment.toFixed(2),
    });
  } catch (err) {
    console.error("EMI Calc Error:", err);
    res.status(500).json({ success: false, error: "Server Error" });
  }
}