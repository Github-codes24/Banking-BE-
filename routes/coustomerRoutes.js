const {
  getCustomers,
  getCustomer,
  deleteCustomer,
  updateCustomer,
  createCustomer,
} = require("../controllers/coustomerController");

const router = require("express").Router();

router.get("/", getCustomers);
// GET /api/customers?page=1&limit=5&name=Ramesh&branch=Bangalore&schemeType=FD

router.get("/:id", getCustomer);
router.post("/", createCustomer);
router.put("/:id", updateCustomer);
router.delete("/:id", deleteCustomer);

module.exports = router;
