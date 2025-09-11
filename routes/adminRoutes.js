const express = require("express");
const router = express.Router();

const {
  createAdmin,
  addBanner,
  updateBanner,
  deleteBanner,
  deleteLoansApplicationForm,
  getFaqs,
  deleteLegalDocs,
  updateGalleryItem,
  addGalleryItem,
  updateFaq,
  deleteFaq,
  loginAdmin,
  addLegalDocs,
  addSchems,
  addLoansApplicationForm,
  addCareers,
  deleteCareers,
  updateCareers,
  addFaq,
  fetchAdminData,
  addAboutUs,
} = require("../controllers/adminController");
const upload = require("../utils/multer");

router.post("/", createAdmin);
router.post("/login", loginAdmin);

// Banner upload
router.post(
  "/banners/add/:id",
  upload.single("bannerImage"),
  addBanner
);
router.put(
  "/banners/update/:itemId/:id",
  upload.single("bannerImage"),
  updateBanner
);
router.delete(
  "/banners/delete/:itemId/:id",
  // upload.single("bannerImage"),
  deleteBanner
);

router.get("/fetchAdmin" ,fetchAdminData)

// Gallery upload
router.post(
  "/gallery/add/:id",
  upload.fields([{ name: "galleryImage", maxCount: 5 }]),
  addGalleryItem
);
router.put(
  "/gallery/update/:id/:itemId",
  upload.fields([{ name: "galleryImage", maxCount: 5 }]),
  updateGalleryItem
);

router.post(
  "/career/:id",
  upload.single("careerDocs"),
  addCareers
);
router.put(
  "/career/:id/:itemId",
  upload.single("careerDocs"),
  updateCareers
);
router.delete(
  "/career/:itemId",
  // upload.single("docs"),
  deleteCareers
);
router.post(
  "/loan-application/:id",
  upload.single("docs"),
  addLoansApplicationForm
);
router.delete(
  "/loan-application/:itemId",

  deleteLoansApplicationForm
);
router.post(
  "/legal-docs/:id",
  upload.single("legaldocs"),
  addLegalDocs
);

router.delete(
  "/legal-docs/:itemId",
  // upload.single("legaldocs"),
  deleteLegalDocs
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
router.post(
  "/aboutUs",
  upload.single("aboutUsImage"),
  addAboutUs
);
module.exports = router;
