const {
  getCustomers,
  getCustomer,
  deleteCustomer,
  updateCustomer,
  createCustomer,
} = require("../controllers/coustomerController");

const router = require("express").Router();

router.get("/", getCustomers);
// GET ?page=2&limit=5  GET /api/customers?fromDate=2023-01-01&toDate=2023-12-31
router.get("/:id", getCustomer);
router.post("/", createCustomer);
router.put("/:id", updateCustomer);
router.delete("/:id", deleteCustomer);

module.exports = router;
