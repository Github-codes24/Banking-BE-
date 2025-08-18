const Customer = require("../models/coustomerModel");
const Agent = require("../models/agentModel");
// @desc    Get all customers
exports.getCustomers = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const { fromDate, toDate, name, contact, branch, schemeType } = req.query;

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

    // Branch filter (match ObjectId directly)
    if (branch) {
      if (mongoose.Types.ObjectId.isValid(branch)) {
        filter.branch = branch;
      }
    }

    // Scheme type filter
    if (schemeType) {
      if (mongoose.Types.ObjectId.isValid(schemeType)) {
        filter["schemes.type"] = schemeType;
      }
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
    console.error(err);
    res.status(500).json({
      success: false,
      error: "Server Error",
      message: err.message,
    });
  }
};


// @desc    Get single customer
exports.getCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, error: "No customer found" });
    }
    res.status(200).json({ success: true, data: customer });
  } catch (err) {
    res.status(500).json({ success: false, error: "Server Error" });
  }
};

// @desc    Create customer
exports.createCustomer = async (req, res) => {
  try {

    const agent = await Agent.findById(req.body.agentId);
    if (!agent) {
      return res.status(404).json({ success: false, error: "Agent not found" });
    }
    req.body.branch  = agent.branch
    req.body.managerId  = agent.managerId
const customer = await Customer.create(req.body);
    res.status(201).json({ success: true, data: customer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server Error" });
  }
};

// @desc    Update customer
exports.updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!customer) {
      return res.status(404).json({ success: false, error: "No customer found" });
    }
    res.status(200).json({ success: true, data: customer });
  } catch (err) {
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({ success: false, error: messages });
    }
    res.status(500).json({ success: false, error: "Server Error" });
  }
};

// @desc    Delete customer
exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, error: "No customer found" });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(500).json({ success: false, error: "Server Error" });
  }
};
