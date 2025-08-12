const Customer = require("../models/coustomerModel");

// @desc    Get all customers
exports.getCustomers = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const { fromDate, toDate, name, contact, branch, schemeType } = req.query;

    // Build filter object
    const filter = {};

    // Date range filter
    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate);
      if (toDate) filter.createdAt.$lte = new Date(toDate);
    }

    // Name filter (case-insensitive partial match)
    if (name) {
      filter.name = { $regex: name, $options: "i" };
    }

    // Contact filter (exact match)
    if (contact) {
      filter.contact = contact;
    }

    // Branch filter (case-insensitive)
    if (branch) {
      filter.branch = { $regex: branch, $options: "i" };
    }

    // Scheme type filter
    if (schemeType) {
      filter["schemes.type"] = schemeType;
    }

    // Get total count
    const total = await Customer.countDocuments(filter);

    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    // Fetch customers
    const customers = await Customer.find(filter)
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    // Pagination info
    const pagination = {
      currentPage: page,
      limit,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
    };

    if (endIndex < total) {
      pagination.next = { page: page + 1, limit };
    }
    if (startIndex > 0) {
      pagination.prev = { page: page - 1, limit };
    }

    res.status(200).json({
      success: true,
      count: customers.length,
      pagination,
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
