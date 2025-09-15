const Branch = require("../models/branchModel");

// Create branch
exports.createBranch = async (req, res) => {
  try {
    const { managerId } = req.body;

    // ✅ Check if manager already assigned to a branch
    const existingBranch = await Branch.findOne({ managerId });
    if (existingBranch) {
      return res.status(400).json({
        success: false,
        message: "This manager is already assigned to another branch.",
      });
    }

    // ✅ Create branch
    const branch = await Branch.create(req.body);

    res.status(201).json({ success: true, data: branch });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};


// Get all branches (with search & pagination)
exports.getBranches = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const { name, code, status } = req.query;

    const filter = {};
    if (name) filter.name = { $regex: name, $options: "i" };
    if (code) filter.code = code.toUpperCase();
    if (status) filter.status = status;

    const total = await Branch.countDocuments(filter);
    const branches = await Branch.find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: branches.length,
      pagination: {
        totalItems: total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
      },
      data: branches,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get single branch
exports.getBranchById = async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) {
      return res.status(404).json({ success: false, message: "Branch not found" });
    }
    res.status(200).json({ success: true, data: branch });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update branch
exports.updateBranch = async (req, res) => {
  try {
    const { managerId } = req.body;

    if (managerId) {
      // ✅ Check if managerId is already assigned to another branch
      const existingBranch = await Branch.findOne({
        managerId,
        _id: { $ne: req.params.id }, // exclude current branch
      });

      if (existingBranch) {
        return res.status(400).json({
          success: false,
          message: "This manager is already assigned to another branch.",
        });
      }
    }

    // ✅ Update branch
    const branch = await Branch.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!branch) {
      return res
        .status(404)
        .json({ success: false, message: "Branch not found" });
    }

    res.status(200).json({ success: true, data: branch });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};


// Delete branch
exports.deleteBranch = async (req, res) => {
  try {
    const branch = await Branch.findByIdAndDelete(req.params.id);
    if (!branch) {
      return res.status(404).json({ success: false, message: "Branch not found" });
    }
    res.status(200).json({ success: true, message: "Branch deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
