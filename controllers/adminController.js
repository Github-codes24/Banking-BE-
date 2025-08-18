const Admin = require("../models/adminModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const uploadToCloudinary = require("../utils/cloudinary");
// Create admin
exports.createAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res
        .status(400)
        .json({ success: false, error: "Email already in use" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin
    const admin = await Admin.create({
      name,
      email,
      password: hashedPassword,
    });

    res.status(201).json({
      success: true,
      data: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.loginAdmin = async (req, res) => {
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
    const admin = await Admin.findOne({ email }).select("+password");
    if (!admin) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Check if password matches
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Create token
    const token = jwt.sign(
      { id: admin._id, role: "admin" },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );

    res.status(200).json({
      success: true,
      token,
      data: admin,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

// Add banner (upload to cloudinary)
exports.addBanner = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ success: false, error: "Admin not found" });
    }

    // Ensure bannerImages is parsed to an array
    let bannerData = [];
    if (typeof req.body.bannerImages === "string") {
      try {
        bannerData = JSON.parse(req.body.bannerImages);
      } catch (e) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid bannerImages JSON" });
      }
    } else if (Array.isArray(req.body.bannerImages)) {
      bannerData = req.body.bannerImages;
    }

    const bannerDataWithImages = [];
    let bannerImageIndex = 0;

    for (const item of bannerData) {
      let imageUrl = item.imageUrl;

      if (
        (!imageUrl || imageUrl === "null" || imageUrl === "") &&
        req.files?.bannerImage?.[bannerImageIndex]
      ) {
        const path = req.files.bannerImage[bannerImageIndex].path;
        const uploaded = await uploadToCloudinary(path);
        imageUrl = uploaded.url;
        bannerImageIndex++;
      }

      bannerDataWithImages.push({
        isActive: item.isActive ?? true,
        imageUrl,
      });
    }

    admin.banners = bannerDataWithImages;

    await admin.save();
    res.status(200).json({ success: true, data: admin.banners });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Add gallery image (upload to cloudinary)
exports.addGalleryImage = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin)
      return res.status(404).json({ success: false, error: "Admin not found" });

    // const galleryData = req.body.galleryImages || "[]";

    let galleryData = [];
    if (typeof req.body.galleryImages === "string") {
      try {
        galleryData = JSON.parse(req.body.galleryImages);
      } catch (e) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid bannerImages JSON" });
      }
    } else if (Array.isArray(req.body.galleryImages)) {
      galleryData = req.body.galleryImages;
    }

    const galleryDataWithImages = [];
    let galleryImageIndex = 0;
    for (const item of galleryData) {
      let imageUrl = item.imageUrl;

      if (
        (!imageUrl || imageUrl === "null" || imageUrl === "") &&
        req.files?.galleryImage?.[galleryImageIndex]
      ) {
        const path = req.files.galleryImage[galleryImageIndex].path;
        const uploaded = await uploadToCloudinary(path);
        imageUrl = uploaded.url;
        galleryImageIndex++;
      }

      galleryDataWithImages.push({
        category: item.category,
        imageUrl,
        caption: item.caption,
      });
    }

    admin.gallery = galleryDataWithImages;

    await admin.save();
    res.status(200).json({ success: true, data: admin.gallery });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.addCareers = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin)
      return res.status(404).json({ success: false, error: "Admin not found" });

    // const careerData = req.body.careerData || "[]";

    let careerData = [];
    if (typeof req.body.careerData === "string") {
      try {
        careerData = JSON.parse(req.body.careerData);
      } catch (e) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid bannerImages JSON" });
      }
    } else if (Array.isArray(req.body.careerData)) {
      careerData = req.body.careerData;
    }

    const careerDataWithImages = [];
    let careerDocsIndex = 0;
    for (const item of careerData) {
      let docs = item.docs;

      if (
        (!docs || docs === "null" || docs === "") &&
        req.files?.docs?.[careerDocsIndex]
      ) {
        const path = req.files.docs[careerDocsIndex].path;
        const uploaded = await uploadToCloudinary(path);
        docs = uploaded.url;
        careerDocsIndex++;
      }

      careerDataWithImages.push({
        title: item.title,
        docs,
        email: item.email,

        contactPerson: item.contactPerson,
        location: item.location,
      });
    }

    admin.careers = careerDataWithImages;

    await admin.save();
    res.status(200).json({ success: true, data: admin.careers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.addLoansApplicationForm = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin)
      return res.status(404).json({ success: false, error: "Admin not found" });

    // const loanApplicationFormData = req.body.loanData || "[]";

    let loanApplicationFormData = [];
    if (typeof req.body.loanData === "string") {
      try {
        loanApplicationFormData = JSON.parse(req.body.loanData);
      } catch (e) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid bannerImages JSON" });
      }
    } else if (Array.isArray(req.body.loanData)) {
      loanApplicationFormData = req.body.loanData;
    }

    const loanDataWithImages = [];
    let loanDocsIndex = 0;
    for (const item of loanApplicationFormData) {
      let docs = item.docs;

      if (
        (!docs || docs === "null" || docs === "") &&
        req.files?.docs?.[loanDocsIndex]
      ) {
        const path = req.files.docs[loanDocsIndex].path;
        const uploaded = await uploadToCloudinary(path);
        docs = uploaded.url;
        loanDocsIndex++;
      }

      loanDataWithImages.push({
        title: item.title,
        docs,
      });
    }

    admin.loanApplication = loanDataWithImages;

    await admin.save();
    res.status(200).json({ success: true, data: admin.loanApplication });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.addLegalDocs = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin)
      return res.status(404).json({ success: false, error: "Admin not found" });

    // const legalDocsData = req.body.legalData || "[]";

    let legalDocsData = [];
    if (typeof req.body.legalData === "string") {
      try {
        legalDocsData = JSON.parse(req.body.legalData);
      } catch (e) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid bannerImages JSON" });
      }
    } else if (Array.isArray(req.body.legalData)) {
      legalDocsData = req.body.legalData;
    }

    const legalDataWithImages = [];
    let legalDocsIndex = 0;
    for (const item of legalDocsData) {
      let docs = item.docs;

      if (
        (!docs || docs === "null" || docs === "") &&
        req.files?.docs?.[legalDocsIndex]
      ) {
        const path = req.files.docs[legalDocsIndex].path;
        const uploaded = await uploadToCloudinary(path);
        docs = uploaded.url;
        legalDocsIndex++;
      }

      legalDataWithImages.push({
        title: item.title,
        docs,
      });
    }

    admin.legalDocs = legalDataWithImages;

    await admin.save();
    res.status(200).json({ success: true, data: admin.legalDocs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.addFaq = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { question, answer } = req.body;

    const admin = await Admin.findById(adminId);
    if (!admin)
      return res
        .status(404)
        .json({ success: false, message: "Admin not found" });

    admin.faq.push({ question, answer });
    await admin.save();

    res.status(201).json({
      success: true,
      message: "FAQ added successfully",
      faq: admin.faq,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all FAQs
exports.getFaqs = async (req, res) => {
  try {
    const { adminId } = req.params;

    const admin = await Admin.findById(adminId).select("faq");
    if (!admin)
      return res
        .status(404)
        .json({ success: false, message: "Admin not found" });

    res.json({ success: true, faq: admin.faq });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update FAQ
exports.updateFaq = async (req, res) => {
  try {
    const { adminId, faqId } = req.params;
    const { question, answer } = req.body;

    const admin = await Admin.findById(adminId);
    if (!admin)
      return res
        .status(404)
        .json({ success: false, message: "Admin not found" });

    const faq = admin.faq.id(faqId);
    if (!faq)
      return res.status(404).json({ success: false, message: "FAQ not found" });

    if (question) faq.question = question;
    if (answer) faq.answer = answer;

    await admin.save();

    res.json({ success: true, message: "FAQ updated successfully", faq });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete FAQ
exports.deleteFaq = async (req, res) => {
  try {
    const { adminId, faqId } = req.params;

    const admin = await Admin.findById(adminId);
    if (!admin)
      return res
        .status(404)
        .json({ success: false, message: "Admin not found" });

    const faq = admin.faq.id(faqId);
    if (!faq)
      return res.status(404).json({ success: false, message: "FAQ not found" });

    faq.deleteOne();
    await admin.save();

    res.json({ success: true, message: "FAQ deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// schems
exports.addSchems = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.adminId);
    if (!admin) {
      return res.status(404).json({ success: false, error: "Admin not found" });
    }

    console.log("req.body.schemsImages", req.body.schemsImages);
    let schemsData = [];

    if (typeof req.body.schemsImages === "string") {
      try {
        schemsData = JSON.parse(req.body.schemsImages);
      } catch (e) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid schemsImages JSON" });
      }
    } else if (Array.isArray(req.body.schemsImages)) {
      schemsData = req.body.schemsImages;
    }

    const schemsDataWithImages = [];
    let schemsImageIndex = 0;

    for (const item of schemsData) {
      let imageUrl = item.imageUrl;

      if (
        (!imageUrl || imageUrl === "null" || imageUrl === "") &&
        req.files?.schemsImage?.[schemsImageIndex]
      ) {
        const path = req.files.schemsImage[schemsImageIndex].path;
        const uploaded = await uploadToCloudinary(path);
        imageUrl = uploaded.url;
        schemsImageIndex++;
      }

      schemsDataWithImages.push({
        name: item.name || "",
        desc: item.desc,
        pdf: imageUrl,
      });
    }

    admin.schemes = schemsDataWithImages;
    await admin.save();

    res.status(200).json({
      success: true,
      message: "Schemes added successfully",
      data: admin.schemes,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, error: err.message });
  }
};
