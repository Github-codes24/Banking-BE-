const Customer = require("../models/coustomerModel");
const Agent = require("../models/agentModel");
// @desc    Get all customers
exports.getCustomers = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const { fromDate, toDate, name, contact, branch, schemeType, managerId, agentId } = req.query;

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
// for date formatting if needed

exports.createCustomer = async (req, res) => {
  try {
    // ✅ Check if agent exists
    const agent = await Agent.findById(req.body.agentId);
    if (!agent) {
      return res.status(404).json({ success: false, error: "Agent not found" });
    }

    // Attach branch & manager info from Agent
    req.body.branch = agent.branch;
    req.body.managerId = agent.managerId;

    // ✅ Generate unique 8-digit CustomerId
    const lastCustomer = await Customer.findOne().sort({ createdAt: -1 });
    let nextCustomerNumber = 10000000; // start from 8 digits (e.g., 10000000)
    if (lastCustomer && lastCustomer.CustomerId) {
      const lastNum = parseInt(lastCustomer.CustomerId); // assuming stored as string of digits
      nextCustomerNumber = lastNum + 1;
    }
    req.body.CustomerId = String(nextCustomerNumber).padStart(8, "0");

    // ✅ Generate unique 8-digit Saving Account Number
    const lastAccount = await Customer.findOne().sort({ createdAt: -1 });
    let nextAccountNumber = 20000000; // start from 20000000
    if (lastAccount && lastAccount.savingAccountNumber) {
      const lastAccNum = parseInt(lastAccount.savingAccountNumber);
      nextAccountNumber = lastAccNum + 1;
    }
    req.body.savingAccountNumber = String(nextAccountNumber).padStart(8, "0");

    // Other Saving Account defaults
    req.body.savingAccountOpeningDate = new Date();
    req.body.savingAccountInterestRate = 4.0; // %
    req.body.savingAccountWithdrawLimit = 25000; // monthly limit
    req.body.savingAccountStatus = "active";

    // ✅ Create Customer
    const customer = await Customer.create(req.body);

    res.status(201).json({ success: true, data: customer });
  } catch (err) {
    console.error("Error creating customer:", err);
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

 // ✅ Check if agent exists
    const agent = await Agent.findById(req.body.agentId);
    if (!agent) {
      return res.status(404).json({ success: false, error: "Agent not found" });
    }

    // Attach branch & manager info from Agent
    req.body.branch = agent.branch;
    req.body.managerId = agent.managerId;

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
