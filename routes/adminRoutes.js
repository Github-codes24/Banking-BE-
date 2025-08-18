const express = require("express");
const router = express.Router();

const {
  createAdmin,
  addBanner,
  getFaqs,
  addGalleryImage,
  updateFaq,
  deleteFaq,
  loginAdmin,
  addLegalDocs,
  addSchems,
  addLoansApplicationForm,
  addCareers,
  addFaq,
} = require("../controllers/adminController");
const upload = require("../utils/multer");

router.post("/", createAdmin);
router.post("/login", loginAdmin);

// Banner upload
router.post(
  "/banners/:id",
  upload.fields([{ name: "bannerImage", maxCount: 5 }]),
  addBanner
);

// Gallery upload
router.post(
  "/gallery/:id",
  upload.fields([{ name: "galleryImage", maxCount: 5 }]),
  addGalleryImage
);

router.post(
  "/career/:id",
  upload.fields([{ name: "docs", maxCount: 5 }]),
  addCareers
);
router.post(
  "/loan-application/:id",
  upload.fields([{ name: "docs", maxCount: 5 }]),
  addLoansApplicationForm
);
router.post(
  "/legal-docs/:id",
  upload.fields([{ name: "docs", maxCount: 5 }]),
  addLegalDocs
);

// faq
router.post("/:adminId/faq", addFaq);

// Get all FAQs
router.get("/:adminId/faq", getFaqs);

// Update FAQ
router.put("/:adminId/faq/:faqId", updateFaq);

// Delete FAQ
router.delete("/:adminId/faq/:faqId", deleteFaq);

// schems
router.post(
  "/:adminId/schemes",
  upload.fields([{ name: "schemsImage", maxCount: 5 }]),
  addSchems
);
module.exports = router;
