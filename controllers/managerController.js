const Manager = require("../models/managerModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendOtpEmail = require("../utils/sendMail");
// const Manager = require("../models/Manager"); // adjust path
const crypto = require("crypto");
const Agent = require("../models/agentModel");
const Branch = require("../models/branchModel");
const uploadToCloudinary = require("../utils/cloudinary");

exports.registerManager = async (req, res) => {
  try {
    const { name, contact, email, password } = req.body;

    // Check if manager exists
    const existingManager = await Manager.findOne({
      $or: [{ email }, { contact }],
    });
    if (existingManager) {
      return res.status(400).json({
        success: false,
        error: "Manager with this email or contact already exists",
      });
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

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // const branchId = req.body.branch;

    // Create manager
    const manager = await Manager.create({
      ...req.body,
      password: hashedPassword,
    });

    // Update branch with managerId
    // await Branch.findByIdAndUpdate(
    //   branchId, // Pass ID directly here
    //   { managerId: manager._id }, // Update object
    //   { new: true } // Optional, returns updated document
    // );

    // Create token
    // const token = jwt.sign(
    //   { id: manager._id, role: 'manager' },
    //   process.env.ACCESS_TOKEN_SECRET,
    //   { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    // );

    res.status(201).json({
      success: true,

      data: manager,
    });
  } catch (err) {
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        error: messages,
      });
    }
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

// @desc    Login manager
// @route   POST /api/managers/login
// @access  Public
exports.loginManager = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Please provide email and password",
      });
    }

    // Check for manager
    const manager = await Manager.findOne({ email }).select("+password");
    if (!manager) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Check if password matches
    const isMatch = await bcrypt.compare(password, manager.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Create token
    const token = jwt.sign(
      { id: manager._id, role: "manager" },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );

    res.status(200).json({
      success: true,
      token,
      data: manager,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

// @desc    Get all managers (with pagination, filtering, sorting)
// @route   GET /api/managers
// @access  Private/Admin
exports.getManagers = async (req, res) => {
  try {
    // Extract query parameters
    const {
      page = 1,
      limit = 10,
      fromDate,
      toDate,
      search,
      name,
      contact,
      email,
      gender,
      education,
      sort = "-createdAt",
      all, // NEW param
    } = req.query;

    // Build filter object
    const filter = {};

    // Date filter
    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate);
      if (toDate) filter.createdAt.$lte = new Date(toDate);
    }

    // Global search filter (searches multiple fields)
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { contact: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } },
        { education: { $regex: search, $options: "i" } },
        { alternateNumber: { $regex: search, $options: "i" } },
      ];
    } else {
      // Individual field filters
      if (name) filter.name = { $regex: name, $options: "i" };
      if (contact) filter.contact = contact;
      if (email) filter.email = email;
      if (education) filter.education = { $regex: education, $options: "i" };
    }

    if (gender) filter.gender = gender;

    // If "all=true", return everything (skip pagination)
    if (all === "true") {
      const managers = await Manager.find(filter)
        .select("-password")
        .sort(sort);

      return res.status(200).json({
        success: true,
        count: managers.length,
        data: managers,
      });
    }

    // Else, use pagination
    const total = await Manager.countDocuments(filter);
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const managers = await Manager.find(filter)
      .select("-password")
      .sort(sort)
      .skip(startIndex)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: managers.length,
      pagination: {
        currentPage: parseInt(page),
        itemsPerPage: parseInt(limit),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        ...(endIndex < total && { nextPage: parseInt(page) + 1 }),
        ...(startIndex > 0 && { prevPage: parseInt(page) - 1 }),
      },
      data: managers,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: "Server Error",
      message: err.message,
    });
  }
};


// @desc    Get single manager
// @route   GET /api/managers/:id
// @access  Private/Admin
exports.getManager = async (req, res) => {
  try {
    const manager = await Manager.findById(req.params.id).select("-password");

    if (!manager) {
      return res.status(404).json({
        success: false,
        error: "Manager not found",
      });
    }

    res.status(200).json({
      success: true,
      data: manager,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

// @desc    Update manager
// @route   PUT /api/managers/:id
// @access  Private/Admin
// ✅ make sure bcrypt is installed

exports.updateManager = async (req, res) => {
  try {
    let { password, ...updateData } = req.body;

    // ✅ If password is sent, hash it before saving
    if (password && password.trim() !== "") {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

 let signature;

if (req.file) {
  try {
    const upload = await uploadToCloudinary(req.file.path, req.file.originalname);
    signature = upload?.url; // Cloudinary usually returns `secure_url`
    updateData.signature = signature;
  } catch (error) {
    console.error("Cloudinary upload failed:", error);
    return res.status(500).json({ message: "File upload failed" });
  }
}


    const manager = await Manager.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      // runValidators: true,
    }).select("-password"); // don’t expose password

    if (!manager) {
      return res.status(404).json({
        success: false,
        error: "Manager not found",
      });
    }

    res.status(200).json({
      success: true,
      data: manager,
    });
  } catch (err) {
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        error: messages,
      });
    }
    res.status(500).json({
      success: false,
      error: "Server Error",
      details: err.message,
    });
  }
};


// @desc    Delete manager
// @route   DELETE /api/managers/:id
// @access  Private/Admin
exports.deleteManager = async (req, res) => {
  try {
    const manager = await Manager.findByIdAndDelete(req.params.id);

    if (!manager) {
      return res.status(404).json({
        success: false,
        error: "Manager not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

// @desc    Update manager password
// @route   PUT /api/managers/:id/password
// @access  Private
exports.updatePasswordOtp = async (req, res) => {
  try {
    const { email } = req.body;

    // 1. Find manager by email
    const manager = await Manager.findOne({ email });
    if (!manager) {
      return res.status(404).json({
        success: false,
        error: "Manager not found",
      });
    }

    // 2. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 3. Save OTP & expiry in DB
    manager.resetPasswordOtp = otp;
    manager.resetPasswordOtpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes
    await manager.save();

    // 4. Send OTP email
    // await sendOtpEmail(email, otp);

    // 5. Respond success
    res.status(200).json({
      otp,
      success: true,
      message: "OTP sent to email",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Find manager
    const manager = await Manager.findOne({ email });
    if (!manager) {
      return res.status(404).json({
        success: false,
        error: "Manager not found",
      });
    }

    // Check OTP & expiry
    if (
      manager.resetPasswordOtp !== otp ||
      !manager.resetPasswordOtpExpires ||
      manager.resetPasswordOtpExpires < Date.now()
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired OTP",
      });
    }

    // Mark OTP as verified
    manager.otpVerified = true;
    await manager.save();

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    // Find manager
    const manager = await Manager.findOne({ email }).select("+password");
    if (!manager) {
      return res.status(404).json({
        success: false,
        error: "Manager not found",
      });
    }

    // Check if OTP was verified
    if (!manager.otpVerified) {
      return res.status(400).json({
        success: false,
        error: "OTP verification required",
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    manager.password = await bcrypt.hash(newPassword, salt);

    // Clear OTP data & flag
    manager.resetPasswordOtp = undefined;
    manager.resetPasswordOtpExpires = undefined;
    manager.otpVerified = undefined;

    await manager.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

exports.getAgents = async (req, res) => {
  try {
    const { managerId } = req.params;
    if (!managerId) {
      return res.status(400).json({
        success: false,
        message: "managerId is required",
      });
    }

    // Pagination params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Search filter
    const search = req.query.search || "";
    const searchQuery = search
      ? {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } }, // if phone field exists
        ],
      }
      : {};

    // Base filter (agents under specific manager)
    const baseFilter = { managerId };

    // Combine filters
    const finalFilter = { ...baseFilter, ...searchQuery };

    // Count total
    const total = await Agent.countDocuments(finalFilter);

    // Fetch agents
    const agents = await Agent.find(finalFilter)
      .populate("managerId", "name email")
      .select("-password")
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      count: agents.length,
      data: agents,
    });
  } catch (err) {
    console.error("Error in getAgents:", err);
    res.status(500).json({
      success: false,
      error: "Server Error: " + err.message,
    });
  }
};
// adjust path to your Manager model

exports.changeManagerPassword = async (req, res) => {
  try {
    const { managerId } = req.params; // or req.user._id if authenticated
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Old password and new password are required",
      });
    }

    // Find manager
    const manager = await Manager.findById(managerId);
    if (!manager) {
      return res.status(404).json({
        success: false,
        message: "Manager not found",
      });
    }

    // Check old password
    const isMatch = await bcrypt.compare(oldPassword, manager.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Old password is incorrect",
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    manager.password = hashedPassword;
    await manager.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (err) {
    console.error("Error in changeManagerPassword:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};


exports.makeAgentBlock = async (req, res) => {
  try {
    const { agentId } = req.params;

    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: "Agent with this ID not found",
      });
    }

    if (!agent.isActive) {
      return res.status(400).json({
        success: false,
        message: "Agent is already blocked",
      });
    }

    agent.isActive = false;
    await agent.save();

    res.status(200).json({
      success: true,
      message: "Agent successfully blocked",
      agent,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

exports.makeAgentUnBlock = async (req, res) => {
  try {
    const { agentId } = req.params;

    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: "Agent with this ID not found",
      });
    }

    if (agent.isActive) {
      return res.status(400).json({
        success: false,
        message: "Agent is already active",
      });
    }

    agent.isActive = true;
    await agent.save();

    res.status(200).json({
      success: true,
      message: "Agent successfully unblocked",
      agent,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};
