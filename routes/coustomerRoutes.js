const {
  getCustomers,
  getCustomer,
  deleteCustomer,
  updateCustomer,
  createCustomer,
  loginCustomerByCoustomerId,
  loginCustomerByMpin,
  sendOtp,
  verifyOtp,
  createFD,
  createMpin,
  createRD,
  resetPassword,
  createMipScheme,
  emiCalculator,
  getCustomerById,
  createLoan,
  createPigmy,
  createLakhpatiSchems,
  depositBalance,
  toggleSavingAccountStatus
} = require("../controllers/coustomerController");
const { authCheck, authorizeRoles } = require("../middilewares/authCheck");

const router = require("express").Router();

const upload = require("../utils/multer");

router.get("/", authCheck, getCustomers);
// GET /api/customers?page=1&limit=5&name=Ramesh&branch=Bangalore&schemeType=FD

router.get("/:id", authCheck, getCustomerById);
router.post("/", authCheck, upload.fields([
  { name: "signature", maxCount: 1 },
  { name: "picture", maxCount: 1 }
]), createCustomer);
router.put("/:id", authCheck, upload.fields([
  { name: "signature", maxCount: 1 },
  { name: "picture", maxCount: 1 }
]), updateCustomer);
router.delete("/:id", authCheck, deleteCustomer);


// coustoome app
router.post("/login/byCoustomerId", loginCustomerByCoustomerId);
router.post("/login/ByMpin", loginCustomerByMpin);
router.post("/sendOtp", sendOtp);
router.post("/verifyOtp", verifyOtp);
router.post("/createMpin", createMpin);
router.post("/resetPassword", resetPassword);
router.post("/createFD/:customerId", authCheck, createFD);
router.post("/createRD/:customerId", authCheck, createRD);
router.post("/createLoan/:customerId", authCheck, createLoan);
router.post("/createPigmy/:customerId", authCheck, createPigmy)
router.post("/createLakhpati/:customerId", authCheck, createLakhpatiSchems)
router.post("/createMIP/:customerId", authCheck, createMipScheme)

router.post("/emi/calculator", emiCalculator);
router.post("/deposit/balance", authCheck , authorizeRoles("manager" ,"agent", "admin"), depositBalance);
router.put("/:customerId/toggle-account-status", authCheck , authorizeRoles("manager","admin"), toggleSavingAccountStatus);

module.exports = router;
