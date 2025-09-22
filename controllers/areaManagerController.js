
const AreaManager = require("../models/AreaManager");
const uploadToCloudinary = require("../utils/cloudinary");

exports.registerAreaManager = async (req, res) => {
    try {
        const {  contact, email } = req.body;

        // Check if manager exists
        const existingManager = await AreaManager.findOne({
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
        // const salt = await bcrypt.genSalt(10);
        // const hashedPassword = await bcrypt.hash(password, salt);

        // const branchId = req.body.branch;

        // Create manager
        const manager = await AreaManager.create(req.body);


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

exports.getAreaManagers = async (req, res) => {
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
      managerId, // NEW filter
      sort = "-createdAt",
      all, // NEW param to fetch all without pagination
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
      // Individual field filters (if no global search)
      if (name) filter.name = { $regex: name, $options: "i" };
      if (contact) filter.contact = contact;
      if (email) filter.email = email;
      if (education) filter.education = { $regex: education, $options: "i" };
    }

    // Exact match filters
    if (gender) filter.gender = gender;
    if (managerId) filter.managerId = managerId; // ✅ filter by parent Manager

    // If "all=true", return everything without pagination
    if (all === "true") {
      const managers = await AreaManager.find(filter)
        .populate("managerId", "name email contact") // ✅ show parent manager info
        .sort(sort);

      return res.status(200).json({
        success: true,
        count: managers.length,
        data: managers,
      });
    }

    // Else, use pagination
    const total = await AreaManager.countDocuments(filter);
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const managers = await AreaManager.find(filter)
      .populate("managerId", "name email contact") // ✅ populate manager details
      .sort(sort)
      .skip(startIndex)
      .limit(parseInt(limit));

    // Response
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


exports.getAreaManager = async (req, res) => {
  try {
    const manager = await AreaManager.findById(req.params.id)

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

exports.updateAreaManager = async (req, res) => {
  try {
    // let {  ...updateData } = req.body;

    // ✅ If password is sent, hash it before saving
    // if (password && password.trim() !== "") {
    //   const salt = await bcrypt.genSalt(10);
    //   updateData.password = await bcrypt.hash(password, salt);
    // }

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


    const manager = await AreaManager.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    //   runValidators: true,
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

exports.deleteAreaManager = async (req, res) => {
  try {
    const manager = await AreaManager.findByIdAndDelete(req.params.id);

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