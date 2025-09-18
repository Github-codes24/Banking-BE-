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
  emiCalculator,
  getCustomerById,
  createLoan
} = require("../controllers/coustomerController");

const router = require("express").Router();

router.get("/", getCustomers);
// GET /api/customers?page=1&limit=5&name=Ramesh&branch=Bangalore&schemeType=FD

router.get("/:id", getCustomerById);
router.post("/", createCustomer);
router.put("/:id", updateCustomer);
router.delete("/:id", deleteCustomer);


// coustoome app
router.post("/login/byCoustomerId", loginCustomerByCoustomerId);
router.post("/login/ByMpin", loginCustomerByMpin);
router.post("/sendOtp", sendOtp);
router.post("/verifyOtp", verifyOtp);
router.post("/createMpin", createMpin);
router.post("/resetPassword", resetPassword);
router.post("/createFD/:customerId", createFD);
router.post("/createRD/:customerId", createRD);
router.post("/createLoan/:customerId", createLoan);
router.post("/emi/calculator", emiCalculator);

module.exports = router;
