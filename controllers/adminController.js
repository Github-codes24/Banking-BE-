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

exports.addBanner = async (req, res) => {
  try {
    // const { imageUrl, type } = req.body;

    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ success: false, error: "Admin not found" });
    }
    let uploadedUrl;
    if (req.file) {
      const uploaded = await uploadToCloudinary(req.file.path);
      uploadedUrl = uploaded.url;
    }

    const data = {
      imageUrl: uploadedUrl,
      // caption: req.body.caption || "",
      type: req.body.type || "",
    };

    admin.banners.push(data);
    await admin.save();

    res.status(201).json({ success: true, banners: admin.banners });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ success: false, message: "Error adding banner", error });
  }
};

exports.deleteBanner = async (req, res) => {
  try {
    const { itemId } = req.params;

    const setting = await Admin.findOne();
    if (!setting) {
      return res
        .status(404)
        .json({ success: false, message: "Setting not found" });
    }

    // find banner
    const banner = setting.banners.id(itemId);
    if (!banner) {
      return res
        .status(404)
        .json({ success: false, message: "Banner not found" });
    }

    // remove from array
    banner.deleteOne();
    await setting.save();

    res.json({ success: true, banners: setting.banners });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error deleting banner", error });
  }
};
// Update banner
exports.updateBanner = async (req, res) => {
  try {
    const { itemId, id } = req.params;
    const { type } = req.body;

    const admin = await Admin.findById(id);
    if (!admin)
      return res.status(404).json({ success: false, error: "Admin not found" });

    const item = admin.banners.id(itemId);
    // let uploadedUrl;
    if (req.file) {
      const uploaded = await uploadToCloudinary(req.file.path);
      // uploadedUrl = uploaded.url;
      item.imageUrl = uploaded.url;
    }

    if (type) item.type = type;

    // if (category) item.category = category;
    await admin.save();
    res.json({ success: true, banners: admin.banners });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error updating banner", error });
  }
};
exports.addGalleryItem = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ success: false, error: "Admin not found" });
    }

    if (!req.files?.galleryImage || req.files.galleryImage.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "No images uploaded" });
    }

    const uploadedImagesurls = [];
    for (const file of req.files.galleryImage) {
      const uploaded = await uploadToCloudinary(file.path);

      uploadedImagesurls.push(uploaded.url);
    }
    const data = {
      imageUrls: uploadedImagesurls,
      caption: req.body.caption || "",
      category: req.body.category || "",
    };

    // Push new items instead of replacing
    admin.gallery.push(data);

    await admin.save();
    res.status(200).json({ success: true, data: admin.gallery });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.updateGalleryItem = async (req, res) => {
  try {
    const { id, itemId } = req.params; // adminId + gallery itemId
    const { caption, category } = req.body;
    let existingImgUrls = [];

    console.log(req.body.exstingImgUrls, "exstingImgUrls");

    if (req.body.exstingImgUrls) {
      try {
        // If frontend sends as stringified JSON array → '["url1","url2"]'
        if (typeof req.body.exstingImgUrls === "string") {
          existingImgUrls = JSON.parse(req.body.exstingImgUrls);
        }
        // If frontend sends as already-parsed array → ["url1","url2"]
        else if (Array.isArray(req.body.exstingImgUrls)) {
          existingImgUrls = req.body.exstingImgUrls;
        }
      } catch (err) {
        console.error("Invalid exstingImgUrls format:", err.message);
        existingImgUrls = [];
      }
    }

    const admin = await Admin.findById(id);
    if (!admin)
      return res.status(404).json({ success: false, error: "Admin not found" });

    const item = admin.gallery.id(itemId);
    console.log(item, "item");
    if (!item)
      return res
        .status(404)
        .json({ success: false, error: "Gallery item not found" });

    // Update fields
    if (caption) item.caption = caption;
    if (category) item.category = category;

    // Handle image URLs - start with existing URLs from request body
    let updatedImgUrls = [...existingImgUrls];
    console.log(updatedImgUrls, "updatedImgUrls1");
    // const uploadedImagesurls = [];
    for (const file of req.files.galleryImage) {
      const uploaded = await uploadToCloudinary(file.path);
      console.log(uploaded.url);
      updatedImgUrls.push(uploaded.url);
    }
    console.log(updatedImgUrls, "updatedImgUrls");
    console.log(req.files.galleryImage, "req.files.galleryImage");
    // Update the item's image URLs
    item.imageUrls = updatedImgUrls;
    console.log(item, "item");
    await admin.save();
    res.status(200).json({ success: true, data: item });
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
    console.log(req.file, "file");
    let uploadedUrl;
    if (req.file) {
      const uploaded = await uploadToCloudinary(req.file.path);
      uploadedUrl = uploaded.url;
    }
    const data = {
      title: req.body.title,
      docs: uploadedUrl,
      email: req.body.email,
      contactPerson: req.body.contactPerson,
      location: req.body.location,
    };

    admin.careers.push(data);
    await admin.save();
    res.status(200).json({ success: true, data: admin.careers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
exports.updateCareers = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin)
      return res.status(404).json({ success: false, error: "Admin not found" });

    // const careerData = req.body.careerData || "[]";

    const career = admin.careers.id(req.params.itemId);
    if (!career) {
      return res
        .status(404)
        .json({ success: false, message: "career not found" });
    }

    let uploadedUrl;
    if (req.file) {
      const uploaded = await uploadToCloudinary(req.file.path);
      uploadedUrl = uploaded.url;
    }

      career.title=req.body.title,
      career.docs=uploadedUrl || career.docs,
      career.email=req.body.email,
      career.contactPerson=req.body.contactPerson,
      career.location= req.body.location,


    // admin.save()
    await admin.save();
    res.status(200).json({ success: true, data: admin.careers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteCareers = async (req, res) => {
  try {
    const { itemId } = req.params;

    const setting = await Admin.findOne();
    if (!setting) {
      return res
        .status(404)
        .json({ success: false, message: "Setting not found" });
    }

    // find banner
    const career = setting.careers.id(itemId);
    if (!career) {
      return res
        .status(404)
        .json({ success: false, message: "career not found" });
    }

    // remove from array
    career.deleteOne();
    await setting.save();

    res.json({ success: true, careers: setting.careers });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error deleting banner", error });
  }
};

exports.addLoansApplicationForm = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin)
      return res.status(404).json({ success: false, error: "Admin not found" });

    let uploadedUrl;
    if (req.file) {
      const uploaded = await uploadToCloudinary(req.file.path);
      uploadedUrl = uploaded.url;
    }

    const data = {
      docs: uploadedUrl,
      // caption: req.body.caption || "",
      title: req.body.title || "",
    };

    admin.loanApplication.push(data);
    await admin.save();
    res.status(200).json({ success: true, data: admin.loanApplication });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteLoansApplicationForm = async (req, res) => {
  try {
    const { itemId } = req.params;

    const setting = await Admin.findOne();
    if (!setting) {
      return res
        .status(404)
        .json({ success: false, message: "Setting not found" });
    }

    // find banner
    const loanApplication = setting.loanApplication.id(itemId);
    if (!loanApplication) {
      return res
        .status(404)
        .json({ success: false, message: "loanApplication not found" });
    }

    // remove from array
    loanApplication.deleteOne();
    await setting.save();

    res.json({ success: true, banners: setting.loanApplication });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error deleting banner", error });
  }
};

exports.addLegalDocs = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin)
      return res.status(404).json({ success: false, error: "Admin not found" });

    let uploadedUrl;
    if (req.file) {
      const uploaded = await uploadToCloudinary(req.file.path);
      uploadedUrl = uploaded.url;
    }

    const data = {
      docs: uploadedUrl,
      // caption: req.body.caption || "",
      title: req.body.title || "",
    };

    admin.legalDocs.push(data);

    await admin.save();
    res.status(200).json({ success: true, data: admin.legalDocs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteLegalDocs = async (req, res) => {
  try {
    const { itemId } = req.params;

    const setting = await Admin.findOne();
    if (!setting) {
      return res
        .status(404)
        .json({ success: false, message: "Setting not found" });
    }

    // find banner
    const LegalDocs = setting.legalDocs.id(itemId);
    if (!LegalDocs) {
      return res
        .status(404)
        .json({ success: false, message: "LegalDocs not found" });
    }

    // remove from array
    LegalDocs.deleteOne();
    await setting.save();

    res.json({ success: true, docs: setting.legalDocs });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error deleting banner", error });
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

exports.fetchAdminData = async (req, res) => {
  try {
    const admin = await Admin.findOne(); // gets the first admin
    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: "No admin found" });
    }

    res.status(200).json({
      success: true,
      message: "Admin data fetched successfully",
      data: admin,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.addAboutUs = async (req, res) => {
  try {
    const { title, desc, vision, values } = req.body;

    // uploaded file from multer-cloudinary
    const imageUrl = req.file ? req.file.path : null;
    let uploadedImage = "";

    if (imageUrl) {
      const path = imageUrl;
      const uploaded = await uploadToCloudinary(path);
      uploadedImage = uploaded.url;
    }

    let valuesArray = [];
    if (values) {
      if (Array.isArray(values)) {
        valuesArray = values; // already array
      } else {
        valuesArray = values.split(",").map((v) => v.trim());
      }
    }

    let admin = await Admin.findOne();
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found. Please create an admin first.",
      });
    }

    admin.aboutsUs = {
      title,
      desc,
      vision,
      values: valuesArray,
      imageUrl: uploadedImage,
    };
    await admin.save();

    res.status(200).json({
      success: true,
      message: "About Us added successfully",
      data: admin.aboutsUs,
    });
  } catch (err) {
    console.error("Error in addAboutUs:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};
