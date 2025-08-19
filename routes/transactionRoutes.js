const express = require("express");
const router = express.Router();
const transactionController = require("../controllers/transactionController");

// CRUD routes
router.post("/saving", transactionController.savingAccountTransaction);
router.post("/fd", transactionController.fdTransaction);
router.post("/rd", transactionController.rdTransaction);
router.post("/loan", transactionController.loanTransaction);
router.post("/pigMy", transactionController.pigMyTransaction);
router.post("/lakhpatiYojna", transactionController.lakhpatiYojnaTransaction);
router.get("/", transactionController.getTransactions);
router.get("/:id", transactionController.getTransactionById);
router.delete("/:id", transactionController.deleteTransaction);
router.put("/:transactionId", transactionController.approveTransaction);
router.put("/:transactionId/savingAc", transactionController.approveTransaactionForSavingAc);
router.get("/today-yesterday/:managerId", transactionController.getTodayYesterdayTransactionsManager);
router.get("/today-yesterday", transactionController.getTodayYesterdayTransactions);
router.get("/manager/:managerId", transactionController.getTransactionsByManager);


module.exports = router;