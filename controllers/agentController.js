const Agent = require("../models/agentModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Manager = require("../models/managerModel");
// Create Agent
exports.createAgent = async (req, res) => {
  try {
    // Hash password if provided
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      req.body.password = await bcrypt.hash(req.body.password, salt);
    }
    const managerId = req.body.managerId;
    const manager =await Manager.findById(managerId);
     if (!manager) {
      return res.status(404).json({ success: false, error: "manager not found" });
    }
    console.log(manager,"manager");
    req.body.branch = manager.branch;
    const agent = await Agent.create(req.body);
    res.status(201).json({ success: true, data: agent });
  } catch (err) {
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

    // Compare password
    const isMatch = await bcrypt.compare(password, agent.password || "");
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: agent._id, role: "agent" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
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
      message: err.message,
    });
  }
};

// Get All Agents (search, filter, pagination)
exports.getAgents = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const { name, contact, branch, managerId, isActive } = req.query;

    const filter = {};
    if (name) filter.name = { $regex: name, $options: "i" };
    if (contact) filter.contact = contact;
    if (branch) filter.branch = branch;
    if (managerId) filter.managerId = managerId;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const total = await Agent.countDocuments(filter);

    const agents = await Agent.find(filter)
      .populate("managerId", "name email")
      .populate("branch", "name code")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

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

     const managerId = req.body.managerId;
    const manager =await Manager.findById(managerId);
     if (!manager) {
      return res.status(404).json({ success: false, error: "manager not found" });
    }
    console.log(manager,"manager");
    req.body.branch = manager.branch;

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
