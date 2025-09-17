const express = require("express");
const router = express.Router();

const {
  createAdmin,
  getlegalItem,
  getGalleryItem,
  deleteSchems,
  updateSchems,
  getCareerItem,
  addBanner,
  updateBanner,
  deleteGalleryItem,
  getBannerItem,
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
  getloanItem,
  updateCareers,
  addFaq,
  fetchAdminData,
  addAboutUs,
  adminPasswordChange,
  getAdmin,
  updatePasswordOtp,
  verifyOtp,
  changePassword
} = require("../controllers/adminController");
const upload = require("../utils/multer");

router.post("/", createAdmin);
router.post("/login", loginAdmin);

// if you have exsting password
router.post("/passwordChange", adminPasswordChange);

router.get("/get", getAdmin);


router.post("/updatePasswordOtp", updatePasswordOtp);
router.post("/verifyOtp", verifyOtp);
// aftre forgot password
router.post("/changePassword", changePassword);

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
router.get(
  "/banners/get/:itemId",
getBannerItem
);
router.delete(
  "/banner/delete/:itemId/:id",
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
router.delete("/gallery/:adminId/:itemId", deleteGalleryItem);
router.get(
  "/gallery/get/:itemId",

  getGalleryItem
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
router.get(
  "/career/get/:itemId",
  // upload.single("docs"),
  getCareerItem
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
router.get(
  "/loan-application/get/:itemId",

  getloanItem
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
router.get(
  "/legal-docs/get/:itemId",
  // upload.single("legaldocs"),
  getlegalItem
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
  "/schemes/add",
   upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "pdf", maxCount: 1 }
  ]),
  addSchems
);
router.put(
  "/schemes/update/:itemId",
   upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "pdf", maxCount: 1 }
  ]),
  updateSchems
);
router.delete(
  "/schemes/delete/:itemId",
  // upload.single("schemes"),
  deleteSchems
);
router.post(
  "/aboutUs/add",
  upload.single("aboutUsImage"),
  addAboutUs
);
module.exports = router;
