const express = require("express");
const router = express.Router();
const transactionController = require("../controllers/transactionController");

// CRUD routes
router.post("/", transactionController.addTransaction);
router.get("/", transactionController.getTransactions);
router.get("/:id", transactionController.getTransactionById);
router.delete("/:id", transactionController.deleteTransaction);
router.put("/:id/:status", transactionController.updateTransactionStatus);


module.exports = router;