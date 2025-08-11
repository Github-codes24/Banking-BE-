const Customer = require("../models/coustomerModel");

// @desc    Get all customers
exports.getCustomers = async (req, res) => {
  try {
    // Extract query parameters
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const { fromDate, toDate } = req.query;

    // Build filter object
    const filter = {};

    // Add date filter if provided
    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) {
        filter.createdAt.$gte = new Date(fromDate);
      }
      if (toDate) {
        filter.createdAt.$lte = new Date(toDate);
      }
    }

    // Get total count with filters
    const total = await Customer.countDocuments(filter);

    // Calculate pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    // Execute query
    const customers = await Customer.find(filter)
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    // Build pagination result
    const pagination = {
      currentPage: page,
      limit,
      totalPages: Math.ceil(total / limit),
      totalItems: total
    };

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    res.status(200).json({
      success: true,
      count: customers.length,
      pagination,
      data: customers
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: "Server Error",
      message: err.message
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
