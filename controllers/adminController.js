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

    const adminObj = admin.toObject();
    delete adminObj.password;

    res.status(200).json({
      success: true,
      token,
      data: adminObj,
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

exports.getBannerItem = async (req, res) => {
  try {
    const { itemId } = req.params; // adminId + gallery itemId
    const admin = await Admin.findOne();
    if (!admin) {
      return res.status(404).json({ success: false, error: "Admin not found" });
    }
    const item = admin.banners.id(itemId);
    res.status(200).json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
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

exports.getGalleryItem = async (req, res) => {
  try {
    const { itemId } = req.params; // adminId + gallery itemId
    const admin = await Admin.findOne();
    if (!admin) {
      return res.status(404).json({ success: false, error: "Admin not found" });
    }
    const item = admin.gallery.id(itemId);
    res.status(200).json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.updateGalleryItem = async (req, res) => {
  try {
    const { id, itemId } = req.params; // adminId + gallery itemId
    const { caption, category } = req.body;

    // Handle existing image URLs from body
    let existingImgUrls = [];
    if (req.body.exstingImgUrls) {
      try {
        if (typeof req.body.exstingImgUrls === "string") {
          existingImgUrls = JSON.parse(req.body.exstingImgUrls);
        } else if (Array.isArray(req.body.exstingImgUrls)) {
          existingImgUrls = req.body.exstingImgUrls;
        }
      } catch (err) {
        console.error("Invalid exstingImgUrls format:", err.message);
        existingImgUrls = [];
      }
    }

    // Normalize files (can be single object or array)
    let galleryFiles = [];
    if (req.files && req.files.galleryImage) {
      galleryFiles = Array.isArray(req.files.galleryImage)
        ? req.files.galleryImage
        : [req.files.galleryImage];
    }

    // Upload new images if present
    const uploadedUrls = [];
    for (const file of galleryFiles) {
      const uploaded = await uploadToCloudinary(file.path);
      uploadedUrls.push(uploaded.url);
    }

    // Merge existing + new
    const updatedImgUrls = [...existingImgUrls, ...uploadedUrls];

    // Atomic update of subdocument
    const admin = await Admin.findOneAndUpdate(
      { _id: id, "gallery._id": itemId },
      {
        $set: {
          "gallery.$.caption": caption,
          "gallery.$.category": category,
          "gallery.$.imageUrls": updatedImgUrls,
        },
      },
      { new: true } // return updated doc
    );

    if (!admin) {
      return res
        .status(404)
        .json({ success: false, error: "Admin or gallery item not found" });
    }

    const updatedItem = admin.gallery.id(itemId);

    res.status(200).json({ success: true, data: updatedItem });
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
      desc: req.body.desc
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

    (career.title = req.body.title),
      (career.docs = uploadedUrl || career.docs),
      (career.email = req.body.email),
      (career.contactPerson = req.body.contactPerson),
      (career.location = req.body.location),
      (career.desc = req.body.desc)
    // admin.save()
    await admin.save();
    res.status(200).json({ success: true, data: admin.careers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getCareerItem = async (req, res) => {
  try {
    const { itemId } = req.params; // adminId + gallery itemId
    const admin = await Admin.findOne();
    if (!admin) {
      return res.status(404).json({ success: false, error: "Admin not found" });
    }
    const item = admin.careers.id(itemId);
    res.status(200).json({ success: true, data: item });
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
      const uploaded = await uploadToCloudinary(req.file.path, req.file.originalName);
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

exports.getloanItem = async (req, res) => {
  try {
    const { itemId } = req.params; // adminId + gallery itemId
    const admin = await Admin.findOne();
    if (!admin) {
      return res.status(404).json({ success: false, error: "Admin not found" });
    }
    const item = admin.loanApplication.id(itemId);
    res.status(200).json({ success: true, data: item });
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
      const uploaded = await uploadToCloudinary(req.file.path, req.file.originalName);
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

exports.getlegalItem = async (req, res) => {
  try {
    const { itemId } = req.params; // adminId + gallery itemId
    const admin = await Admin.findOne();
    if (!admin) {
      return res.status(404).json({ success: false, error: "Admin not found" });
    }
    const item = admin.legalDocs.id(itemId);
    res.status(200).json({ success: true, data: item });
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
    // const { adminId } = req.params;
    // const { question, answer } = req.body;
    console.log(req.body, "body")
    const admin = await Admin.findOne();
    if (!admin)
      return res
        .status(404)
        .json({ success: false, message: "Admin not found" });

    admin.faq = req.body.faqs
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
    const admin = await Admin.findOne();
    if (!admin) {
      return res.status(404).json({ success: false, error: "Admin not found" });
    }

    let logoUrl = "";
    let pdfUrl = "";
    console.log(req.files["logo"], req.files["pdf"])
    // Upload logo if exists
    if (req.files && req.files["logo"]) {
      const uploadedLogo = await uploadToCloudinary(req.files["logo"][0].path, req.files["logo"][0].originalname);
      logoUrl = uploadedLogo.url;
    }

    // Upload pdf if exists
    if (req.files && req.files["pdf"]) {
      const uploadedPdf = await uploadToCloudinary(req.files["pdf"][0].path, req.files["pdf"][0].originalname)
      pdfUrl = uploadedPdf.url;
    }

    const data = {
      name: req.body.name || "",
      desc: req.body.desc || "",
      logo: logoUrl || "",
      pdf: pdfUrl || "",
    };

    admin.schemes.push(data);
    await admin.save();

    res.status(200).json({
      success: true,
      message: "Schemes added successfully",
      data: admin.schemes,
    });
  } catch (err) {
    console.error("Add Schemes Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};
exports.updateSchems = async (req, res) => {
  try {
    const { itemId } = req.params;
    const admin = await Admin.findOne();

    if (!admin) {
      return res.status(404).json({ success: false, error: "Admin not found" });
    }

    const scheme = admin.schemes.id(itemId);
    if (!scheme) {
      return res.status(404).json({ success: false, message: "Scheme not found" });
    }

    let logoUrl = null;
    let pdfUrl = null;



    // Upload logo if exists
    if (req.files && req.files["logo"]) {
      const uploadedLogo = await uploadToCloudinary(req.files["logo"][0].path);
      logoUrl = uploadedLogo.url;
    }

    // Upload pdf if exists
    if (req.files && req.files["pdf"]) {
      const uploadedPdf = await uploadToCloudinary(req.files["pdf"][0].path);
      pdfUrl = uploadedPdf.url;
    }

    // Update fields (keep old if not provided)
    scheme.name = req.body.name || scheme.name;
    scheme.desc = req.body.desc || scheme.desc;
    scheme.logo = logoUrl || scheme.logo;
    scheme.pdf = pdfUrl || scheme.pdf;

    await admin.save();

    res.status(200).json({
      success: true,
      message: "Scheme updated successfully",
      data: scheme, // return updated scheme instead of all schemes
    });
  } catch (err) {
    console.error("Update Schemes Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getSchemsById = async (req, res) => {
  try {
    const { itemId } = req.params;
    const admin = await Admin.findOne();

    if (!admin) {
      return res.status(404).json({ success: false, error: "Admin not found" });
    }

    const scheme = admin.schemes.id(itemId);
    if (!scheme) {
      return res.status(404).json({ success: false, message: "Scheme not found" });
    }

    res.status(200).json({
      success: true,
      message: "Scheme fetch successfully",
      data: scheme, // return updated scheme instead of all schemes
    });
  } catch (err) {
    console.error("Update Schemes Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}


exports.deleteSchems = async (req, res) => {
  try {
    const { itemId } = req.params;

    const setting = await Admin.findOne();
    if (!setting) {
      return res
        .status(404)
        .json({ success: false, message: "Setting not found" });
    }

    // find banner
    const schemes = setting.schemes.id(itemId);
    if (!schemes) {
      return res
        .status(404)
        .json({ success: false, message: "schemes not found" });
    }

    // remove from array
    schemes.deleteOne();
    await setting.save();

    res.json({ success: true, data: setting.schemes });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error deleting schemes", error });
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

    // uploaded file from multer
    const imageUrl = req.file ? req.file.path : null;
    let uploadedImage = req.body.imageUrl || "";

    if (imageUrl) {
      const uploaded = await uploadToCloudinary(imageUrl);
      uploadedImage = uploaded.url;
    }

    // Ensure values is always an array
    let valuesArray = [];
    if (values) {
      if (Array.isArray(values)) {
        valuesArray = values;
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


exports.getAdmin = async (req, res) => {
  try {
    let admin = await Admin.findOne();
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found. Please create an admin first.",
      });
    }
    res.status(200).json({
      success: true,

      data: admin,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /api/admin/gallery/:adminId/:itemId
exports.deleteGalleryItem = async (req, res) => {
  try {
    const { adminId, itemId } = req.params;

    // 1️⃣ Find the admin
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ success: false, error: "Admin not found" });
    }

    // 2️⃣ Remove the gallery item using pull
    const itemIndex = admin.gallery.findIndex((g) => g._id.toString() === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({ success: false, error: "Gallery item not found" });
    }

    admin.gallery.splice(itemIndex, 1); // remove the item

    // 3️⃣ Save the admin document
    await admin.save();

    res.status(200).json({ success: true, message: "Gallery item deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};


exports.adminPasswordChange = async (req, res) => {
  try {
    const { adminId, oldPassword, newPassword } = req.body;

    if (!adminId || !oldPassword || !newPassword) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    // Find admin
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: "Admin not found" });
    }

    // Check old password
    const isMatch = await bcrypt.compare(oldPassword, admin.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Old password is incorrect" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(newPassword, salt);

    await admin.save();

    return res
      .status(200)
      .json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    console.error("Password change error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};



exports.updatePasswordOtp = async (req, res) => {
  try {
    const { email } = req.body;

    // 1. Find manager by email
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({
        success: false,
        error: "admin not found",
      });
    }

    // 2. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 3. Save OTP & expiry in DB
    admin.resetPasswordOtp = otp;
    admin.resetPasswordOtpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes
    await admin.save();

    // 4. Send OTP email
    // await sendOtpEmail(email, otp);

    // 5. Respond success
    res.status(200).json({
      success: true,
      otp: otp, // for testing, remove in production
      message: "OTP sent to email",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Find manager
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({
        success: false,
        error: "admin not found",
      });
    }

    // Check OTP & expiry
    if (
      admin.resetPasswordOtp !== otp ||
      !admin.resetPasswordOtpExpires ||
      admin.resetPasswordOtpExpires < Date.now()
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired OTP",
      });
    }

    // Mark OTP as verified
    admin.otpVerified = true;
    await admin.save();

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    // Find manager
    const admin = await Admin.findOne({ email }).select("+password");
    if (!admin) {
      return res.status(404).json({
        success: false,
        error: "admin not found",
      });
    }

    // Check if OTP was verified
    if (!admin.otpVerified) {
      return res.status(400).json({
        success: false,
        error: "OTP verification required",
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(newPassword, salt);

    // Clear OTP data & flag
    admin.resetPasswordOtp = undefined;
    admin.resetPasswordOtpExpires = undefined;
    admin.otpVerified = undefined;

    await admin.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

