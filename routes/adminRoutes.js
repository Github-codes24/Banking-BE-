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
  getSchemsById,
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
const { authCheck } = require("../middilewares/authCheck");

router.post("/", createAdmin);
router.post("/login", loginAdmin);

// if you have exsting password
router.post("/passwordChange", authCheck, adminPasswordChange);

router.get("/get", getAdmin);


router.post("/updatePasswordOtp", updatePasswordOtp);
router.post("/verifyOtp", verifyOtp);
// aftre forgot password
router.post("/changePassword", changePassword);

// Banner upload
router.post(
  "/banners/add/:id",
  authCheck,
  upload.single("bannerImage"),
  addBanner
);
router.put(
  "/banners/update/:itemId/:id",
  authCheck,
  upload.single("bannerImage"),
  updateBanner
);
router.get(
  "/banners/get/:itemId",
getBannerItem
);
router.delete(
  "/banner/delete/:itemId/:id",
  authCheck,
  // upload.single("bannerImage"),
  deleteBanner
);

router.get("/fetchAdmin" ,fetchAdminData)

// Gallery upload
router.post(
  "/gallery/add/:id",
  authCheck,
  upload.fields([{ name: "galleryImage", maxCount: 5 }]),
  addGalleryItem
);
router.put(
  "/gallery/update/:id/:itemId",
  authCheck,
  upload.fields([{ name: "galleryImage", maxCount: 5 }]),
  updateGalleryItem
);
router.delete("/gallery/:adminId/:itemId",authCheck, deleteGalleryItem);
router.get(
  "/gallery/get/:itemId",

  getGalleryItem
);

router.post(
  "/career/:id",
  authCheck,
  upload.single("careerDocs"),
  addCareers
);
router.put(
  "/career/:id/:itemId",
  authCheck,
  upload.single("careerDocs"),
  updateCareers
);
router.delete(
  "/career/:itemId",
  authCheck,
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
  authCheck,
  upload.single("docs"),
  addLoansApplicationForm
);
router.delete(
  "/loan-application/:itemId",
  authCheck,


  deleteLoansApplicationForm
);
router.get(
  "/loan-application/get/:itemId",

  getloanItem
);
router.post(
  "/legal-docs/:id",
  authCheck,

  upload.single("legaldocs"),
  addLegalDocs
);

router.delete(
  "/legal-docs/:itemId",
  authCheck,

  // upload.single("legaldocs"),
  deleteLegalDocs
);
router.get(
  "/legal-docs/get/:itemId",
  // upload.single("legaldocs"),
  getlegalItem
);

// faq
router.put("/faq", addFaq);

// Get all FAQs
router.get("/:adminId/faq", getFaqs);

// Update FAQ
router.put("/:adminId/faq/:faqId", updateFaq);

// Delete FAQ
router.delete("/:adminId/faq/:faqId", deleteFaq);

// schems
router.post(
  "/schemes/add",
  authCheck,
   upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "pdf", maxCount: 1 }
  ]),
  addSchems
);
router.put(
  "/schemes/update/:itemId",
  authCheck,
   upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "pdf", maxCount: 1 }
  ]),
  updateSchems
);
router.delete(
  "/schemes/delete/:itemId",
  authCheck,
  // upload.single("schemes"),
  deleteSchems
);
router.get(
  "/schemes/get/:itemId",
  // upload.single("schemes"),
  getSchemsById
);
router.post(
  "/aboutUs/add",
  authCheck,
  upload.single("aboutUsImage"),
  addAboutUs
);
module.exports = router;
