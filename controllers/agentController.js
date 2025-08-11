const Agent = require('../models/agentModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// @desc    Register a new agent
// @route   POST /api/agents/register
// @access  Private (Admin/Manager)
exports.registerAgent = async (req, res) => {
  try {
    const {  contact, email } = req.body;

    // Check if agent exists
    const existingAgent = await Agent.findOne({ $or: [{ email }, { contact }] });
    if (existingAgent) {
      return res.status(400).json({
        success: false,
        error: 'Agent with this email or contact already exists'
      });
    }



    // Create agent
    const agent = await Agent.create({
      ...req.body,

      ownerId: req.user.id,

    });

    // Create token

    res.status(201).json({
      success: true,

      data: agent
    });
  } catch (err) {
    console.log(err,"er")
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        error: messages
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Login agent
// @route   POST /api/agents/login
// @access  Public
// exports.loginAgent = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     // Validate email & password
//     if (!email || !password) {
//       return res.status(400).json({
//         success: false,
//         error: 'Please provide email and password'
//       });
//     }

//     // Check for agent
//     const agent = await Agent.findOne({ email }).select('+password');
//     if (!agent) {
//       return res.status(401).json({
//         success: false,
//         error: 'Invalid credentials'
//       });
//     }

//     // Check if password matches
//     const isMatch = await bcrypt.compare(password, agent.password);
//     if (!isMatch) {
//       return res.status(401).json({
//         success: false,
//         error: 'Invalid credentials'
//       });
//     }

//     // Create token
//     const token = jwt.sign(
//       { id: agent._id, role: 'agent' },
//       process.env.JWT_SECRET,
//       { expiresIn: process.env.JWT_EXPIRE }
//     );

//     res.status(200).json({
//       success: true,
//       token,
//       data: agent
//     });
//   } catch (err) {
//     res.status(500).json({
//       success: false,
//       error: 'Server Error'
//     });
//   }
// };

// @desc    Get all agents (with pagination, filtering, sorting)
// @route   GET /api/agents
// @access  Private (Admin/Manager)
exports.getAgents = async (req, res) => {
  try {
    // Extract query parameters
    const {
      page = 1,
      limit = 10,
      search,
      fromDate,
      toDate,
      name,
      contact,
      email,
      gender,
      education,

      sort = '-createdAt'
    } = req.query;

    // Build filter object
    const filter = {};

    // For managers, only show their agents
    if (req.role==="manager") {
      filter.ownerId.toString() = req.user._id.toString();
    } else {

    }

    // Date filter
    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate);
      if (toDate) filter.createdAt.$lte = new Date(toDate);
    }

    // Global search filter
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { contact: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
        { education: { $regex: search, $options: 'i' } }
      ];
    } else {
      // Individual field filters
      if (name) filter.name = { $regex: name, $options: 'i' };
      if (contact) filter.contact = contact;
      if (email) filter.email = email;
      if (education) filter.education = { $regex: education, $options: 'i' };
    }

    // Exact match filters
    if (gender) filter.gender = gender;

    // Get total count with filters
    const total = await Agent.countDocuments(filter);

    // Calculate pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    // Execute query
    const agents = await Agent.find(filter)
      .select('-password')
      .populate('ownerId', 'name contact')
      .sort(sort)
      .skip(startIndex)
      .limit(limit);

    // Response
    res.status(200).json({
      success: true,
      count: agents.length,
      pagination: {
        currentPage: parseInt(page),
        itemsPerPage: parseInt(limit),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        ...(endIndex < total && { nextPage: parseInt(page) + 1 }),
        ...(startIndex > 0 && { prevPage: parseInt(page) - 1 })
      },
      data: agents
    });

  } catch (err) {
    console.log(err,"er")
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get single agent
// @route   GET /api/agents/:id
// @access  Private (Admin/Manager/Agent-self)
exports.getAgent = async (req, res) => {
  try {
    let agent;

    // // Agents can only view their own profile unless admin/manager
    // if (req.role === 'agent' && req.user.id !== req.params.id) {
    //   return res.status(403).json({
    //     success: false,
    //     error: 'Not authorized to view this agent'
    //   });
    // }

    agent = await Agent.findById(req.params.id)
      .select('-password')
      .populate('ownerId', 'name contact');

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    res.status(200).json({
      success: true,
      data: agent
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Update agent
// @route   PUT /api/agents/:id
// @access  Private (Admin/Manager/Agent-self)
exports.updateAgent = async (req, res) => {
  try {
    let agent = await Agent.findById(req.params.id);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }
console.log(agent.ownerId)
console.log(req.user._id)
console.log(req.role)
    // Check authorization
  if (req.role=="manager" && agent.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this agent'
      });
    }





    agent = await Agent.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).select('-password');

    res.status(200).json({
      success: true,
      data: agent
    });
  } catch (err) {
    console.log(err,"eer")
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        error: messages
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Delete agent
// @route   DELETE /api/agents/:id
// @access  Private (Admin/Manager)
exports.deleteAgent = async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    // Check authorization
if (req.role=="manager" && agent.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this agent'
      });
    }

    await Agent.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    console.log(err,"err")
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Update agent password
// @route   PUT /api/agents/:id/password
// @access  Private (Agent-self)
// exports.updatePassword = async (req, res) => {
//   try {
//     // Only allow agents to update their own password
//     if (req.user.id !== req.params.id) {
//       return res.status(403).json({
//         success: false,
//         error: 'Not authorized to update this password'
//       });
//     }

//     const agent = await Agent.findById(req.params.id).select('+password');

//     if (!agent) {
//       return res.status(404).json({
//         success: false,
//         error: 'Agent not found'
//       });
//     }

//     // Verify current password
//     const isMatch = await bcrypt.compare(req.body.currentPassword, agent.password);
//     if (!isMatch) {
//       return res.status(401).json({
//         success: false,
//         error: 'Current password is incorrect'
//       });
//     }

//     // Hash new password
//     const salt = await bcrypt.genSalt(10);
//     agent.password = await bcrypt.hash(req.body.newPassword, salt);
//     await agent.save();

//     res.status(200).json({
//       success: true,
//       data: { id: agent._id }
//     });
//   } catch (err) {
//     res.status(500).json({
//       success: false,
//       error: 'Server Error'
//     });
//   }
// };