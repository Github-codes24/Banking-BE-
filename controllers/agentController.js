const Agent = require("../models/agentModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Manager = require("../models/managerModel");
const AreaManager = require("../models/AreaManager");
const Coustomer = require("../models/coustomerModel");
const uploadToCloudinary = require("../utils/cloudinary");
// Create Agent
exports.createAgent = async (req, res) => {
  try {
    // 🔍 Check if email or contact already exists
    const { email, contact, areaManagerId } = req.body;

    if (email) {
      const existingByEmail = await Agent.findOne({ email });
      if (existingByEmail) {
        return res
          .status(400)
          .json({ success: false, message: "Agent with this email already exists" });
      }
    }

    if (contact) {
      const existingByContact = await Agent.findOne({ contact });
      if (existingByContact) {
        return res
          .status(400)
          .json({ success: false, message: "Agent with this mobile already exists" });
      }
    }

    // 🔑 Hash password if provided
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      req.body.password = await bcrypt.hash(req.body.password, salt);
    }

    // 📄 Upload signature if provided
    if (req.file) {
      try {
        const upload = await uploadToCloudinary(req.file.path, req.file.originalname);
        req.body.signature = upload?.url; // Cloudinary returns secure_url usually
      } catch (error) {
        console.error("Cloudinary upload failed:", error);
        return res.status(500).json({ message: "File upload failed" });
      }
    }

    // 🧑‍💼 Validate area manager
    const manager = await AreaManager.findById(areaManagerId);
    if (!manager) {
      return res
        .status(404)
        .json({ success: false, error: "Manager not found" });
    }

    // Save managerId into agent body
    req.body.managerId = manager.managerId;

    // 🆕 Create agent
    const agent = await Agent.create(req.body);

    res.status(201).json({ success: true, data: agent });
  } catch (err) {
    console.error("Create agent error:", err.message);
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.loginAgent = async (req, res) => {
  try {
    const { contact, password } = req.body;

    // Check if both fields are provided
    if (!contact || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide contact number and password",
      });
    }

    // Find agent by contact
    const agent = await Agent.findOne({ contact });
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: "Agent not found",
      });
    }

    // Check if agent is active
    if (!agent.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account is blocked. Please contact admin.",
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, agent.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: agent._id, role: "agent" },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      data: {
        id: agent._id,
        name: agent.name,
        contact: agent.contact,
        email: agent.email,
        branch: agent.branch,
        managerId: agent.managerId,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// Get All Agents (search, filter, pagination)
exports.getAgents = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const { search, branch, managerId, areaManagerId, isActive, all } = req.query;

    const filter = {};

    // 🔎 Search by name OR contact
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { contact: { $regex: search, $options: "i" } },
      ];
    }

    if (branch) filter.branch = branch;
    if (managerId) filter.managerId = managerId;
    if (areaManagerId) filter.areaManagerId = areaManagerId; // ✅ New filter
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const total = await Agent.countDocuments(filter);

    let query = Agent.find(filter)
      .populate("managerId", "name email")
      .populate("areaManagerId", "name email") // ✅ populate areaManager
      .populate("branch", "name code")
      .sort({ createdAt: -1 });

    // ✅ If "all=true" → return all agents without pagination
    if (all === "true") {
      const agents = await query;
      return res.status(200).json({
        success: true,
        count: agents.length,
        pagination: {
          totalItems: total,
          currentPage: null,
          totalPages: 1,
        },
        data: agents,
      });
    }

    // ✅ Otherwise, apply pagination
    const agents = await query.skip((page - 1) * limit).limit(limit);

    res.status(200).json({
      success: true,
      count: agents.length,
      pagination: {
        totalItems: total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
      },
      data: agents,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};



// Get Single Agent
exports.getAgentById = async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id)
      .populate("managerId", "name email")
      .populate("areaManagerId", "name email")
      .populate("branch", "name code");

    if (!agent) {
      return res
        .status(404)
        .json({ success: false, message: "Agent not found" });
    }

    res.status(200).json({ success: true, data: agent });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update Agent
exports.updateAgent = async (req, res) => {
  try {
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      req.body.password = await bcrypt.hash(req.body.password, salt);
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


    const areaManagerId = req.body.areaManagerId;
    const manager = await AreaManager.findById(areaManagerId);
    if (!manager) {
      return res
        .status(404)
        .json({ success: false, error: "manager not found" });
    }
    console.log(manager, "manager");

    req.body.managerId = manager.managerId

    // req.body.branch = manager.branch;

    const agent = await Agent.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!agent) {
      return res
        .status(404)
        .json({ success: false, message: "Agent not found" });
    }

    res.status(200).json({ success: true, data: agent });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateAgentMinimalInfo = async (req, res) => {
  try {
    const { agentId } = req.params;

    // Allow only minimal fields to be updated
    const allowedUpdates = ["name", "email", "contact", "address", "education", "alternateNumber"];
    const updates = {};

    for (let key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    const agent = await Agent.findByIdAndUpdate(agentId, updates, {
      new: true,
      runValidators: true,
      select: "-password", // hide password
    });

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: "Agent not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Agent info updated successfully",
      data: agent,
    });
  } catch (err) {
    console.error("Error in updateAgentMinimalInfo:", err);
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};


// Delete Agent
exports.deleteAgent = async (req, res) => {
  try {
    const agent = await Agent.findByIdAndDelete(req.params.id);
    if (!agent) {
      return res
        .status(404)
        .json({ success: false, message: "Agent not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Agent deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getCustomer = async (req, res) => {
  try {
    const { agentId } = req.params;
    if (!agentId) {
      return res
        .status(400)
        .json({ success: false, message: "agentId is required" });
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
          { phone: { $regex: search, $options: "i" } },
        ],
      }
      : {};

    // Base filter (customers under specific agent)
    const baseFilter = { agentId };

    // Combine filters
    const finalFilter = { ...baseFilter, ...searchQuery };

    // Total count
    const total = await Coustomer.countDocuments(finalFilter);

    // Fetch data
    const customers = await Coustomer.find(finalFilter)
      .populate("agentId", "name email") // populate agent details
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      count: customers.length,
      data: customers,
    });
  } catch (err) {
    console.error("Error fetching customers:", err);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};
