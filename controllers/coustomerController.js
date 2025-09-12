const Customer = require("../models/coustomerModel");
const Agent = require("../models/agentModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const otpGenerator = require("otp-generator");
// @desc    Get all customers
exports.getCustomers = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const {
      fromDate,
      toDate,
      name,
      contact,
      branch,
      schemeType,
      managerId,
      agentId,
    } = req.query;

    const filter = {};

    // Date filter
    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate && !isNaN(new Date(fromDate))) {
        filter.createdAt.$gte = new Date(fromDate);
      }
      if (toDate && !isNaN(new Date(toDate))) {
        filter.createdAt.$lte = new Date(toDate);
      }
    }

    // Name filter
    if (name) {
      filter.name = { $regex: name, $options: "i" };
    }

    // Contact filter
    if (contact) {
      filter.contact = contact;
    }

    // Branch filter (ObjectId check)
    if (branch && mongoose.Types.ObjectId.isValid(branch)) {
      filter.branch = branch;
    }

    // Scheme type filter
    if (schemeType && mongoose.Types.ObjectId.isValid(schemeType)) {
      filter["schemes.type"] = schemeType;
    }

    // ✅ Manager filter
    if (managerId && mongoose.Types.ObjectId.isValid(managerId)) {
      filter.managerId = managerId;
    }

    // ✅ Agent filter
    if (agentId && mongoose.Types.ObjectId.isValid(agentId)) {
      filter.agentId = agentId;
    }

    const total = await Customer.countDocuments(filter);

    const customers = await Customer.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("branch", "name")
      .populate("managerId", "name")
      .populate("agentId", "name")
      .populate("schemes.type", "ledgerType");

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


exports.getCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res
        .status(404)
        .json({ success: false, error: "No customer found" });
    }
    res.status(200).json({ success: true, data: customer });
  } catch (err) {
    res.status(500).json({ success: false, error: "Server Error" });
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

    // Attach branch & manager info from Agent
    req.body.branch = agent.branch;
    req.body.managerId = agent.managerId;

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
      return res.status(400).json({ success: false, error: "Password is required" });
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
        return res.status(404).json({ success: false, error: "Agent not found" });
      }
      req.body.branch = agent.branch;
      req.body.managerId = agent.managerId;
    }

    // ✅ Hash password if updating
    if (password) {
      req.body.password = await bcrypt.hash(password, 10);
    }

    // ✅ Update customer
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
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
      return res.status(400).json({ success: false, message: "CustomerId number is required" });
    }

    // Check if customer exists
    const customer = await Customer.findOne({ CustomerId });
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    // Generate 6-digit OTP
    const otp = otpGenerator.generate(6, { digits: true, alphabets: false, upperCase: false, specialChars: false });

    // Save OTP with expiry
    customer.otp = otp;
    customer.otpExpiry = Date.now() + 5 * 60 * 1000; // 5 min
    customer.isOtpVerified = false;
    await customer.save();

    // Send OTP
    // await sendSms(mobile, `Your OTP is ${otp}`);

    res.status(200).json({ success: true, otp, message: "OTP sent successfully" });
  } catch (err) {
    console.error("Send OTP error:", err);
    res.status(500).json({ success: false, message: "Server error while sending OTP" });
  }
};
exports.verifyOtp = async (req, res) => {
  try {
    const { CustomerId, otp } = req.body;

    const customer = await Customer.findOne({ CustomerId });
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    if (customer.otp !== otp || Date.now() > customer.otpExpiry) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    // Mark verified
    customer.isOtpVerified = true;
    customer.otp = undefined;
    customer.otpExpiry = undefined;
    await customer.save();

    res.status(200).json({ success: true, message: "OTP verified successfully" });
  } catch (err) {
    console.error("Verify OTP error:", err);
    res.status(500).json({ success: false, message: "Server error while verifying OTP" });
  }
};

exports.createMpin = async (req, res) => {
  try {
    const { CustomerId, mpin } = req.body;

    const customer = await Customer.findOne({ CustomerId });
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    // Ensure OTP verified first
    if (!customer.isOtpVerified) {
      return res.status(400).json({ success: false, message: "Please verify OTP before setting MPIN" });
    }

    // Hash MPIN
    const hashedMpin = await bcrypt.hash(mpin, 10);
    customer.Mpin = hashedMpin;
    customer.isOtpVerified = false; // reset after use
    await customer.save();

    res.status(200).json({ success: true, message: "MPIN created successfully" });
  } catch (err) {
    console.error("Create MPIN error:", err);
    res.status(500).json({ success: false, message: "Server error while creating MPIN" });
  }
};

exports.resetPassword = async (req, res) => {
   try {
    const { CustomerId, newPassword } = req.body;

    const customer = await Customer.findOne({ CustomerId });
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    // Ensure OTP verified first
    if (!customer.isOtpVerified) {
      return res.status(400).json({ success: false, message: "Please verify OTP before setting password" });
    }

    // Hash MPIN
    const hashedPass = await bcrypt.hash(newPassword, 10);
    customer.password = hashedPass;
    customer.isOtpVerified = false; // reset after use
    await customer.save();

    res.status(200).json({ success: true, message: "password updated successfully" });
  } catch (err) {
    console.error("Create password error:", err);
    res.status(500).json({ success: false, message: "Server error while creating password" });
  }
}


exports.createFD = async (req, res) => {
  try {
    const { customerId } = req.params; // pass customerId in URL
    const {
      fdDepositAmount,
      // fdInterestRate,
      maturityInstruction,
      fdTenure,
      fdTenureType, // "month" or "year"
      fdPayoutFrequency, // monthly, quarterly, yearly, atMaturity
    } = req.body;

    // ✅ Find customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, error: "Customer not found" });
    }

    // ✅ Generate unique FD account number
    const fdAccountNumber = "FD" + Date.now(); // better: use sequence generator

    // ✅ Opening Date
    const openingDate = new Date();

    // ✅ Calculate maturity date
    let maturityDate = moment(openingDate);
    if (fdTenureType === "year") {
      maturityDate = maturityDate.add(Number(fdTenure), "years");
    } else {
      maturityDate = maturityDate.add(Number(fdTenure), "months");
    }

    // ✅ Calculate maturity amount (Simple compound formula)
    const principal = Number(fdDepositAmount);
    const rate = Number(process.env.FD_INTREST_RATE||6) / 100;
    const time = fdTenureType === "year" ? Number(fdTenure) : Number(fdTenure) / 12;

    const maturityAmount = principal * Math.pow(1 + rate / 1, time); // annual compounding

    // ✅ Create FD object
    const fdScheme = {
      type: "FD", // just a marker (can be Ledger ref later)
      fdAccountNumber,
      fdOpeningDate: openingDate,
      fdDepositAmount: principal,
      fdInterestRate:process.env.FD_INTREST_RATE||6,
      fdTenure,
      fdTenureType,
      fdMaturityDate: maturityDate.toDate(),
      fdMaturityAmount: maturityAmount.toFixed(2),
      // fdPayoutFrequency,
      maturityInstruction,
      fdAccountStatus: "active",
    };

    // ✅ Push to customer.schemes
    customer.schemes.push(fdScheme);
    await customer.save();

    res.status(201).json({
      success: true,
      message: "FD account created successfully",
      data: fdScheme,
    });
  } catch (err) {
    console.error("Error creating FD:", err);
    res.status(500).json({ success: false, error: "Server Error: " + err.message });
  }
};