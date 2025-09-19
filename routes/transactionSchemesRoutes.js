const express = require("express");
const { rdTransaction ,getTransactionById,pigmyEmiTransaction,loanEmiTransaction,fdTransaction,TransactionApproval,getTransaction} = require("../controllers/transactionSchemesController");
const router = express.Router();


router.post("/rdTransaction", rdTransaction);
router.post("/fdTransaction", fdTransaction);
router.post("/loanEmiTransaction", loanEmiTransaction);
router.post("/pigmyEmiTransaction", pigmyEmiTransaction);
router.get("/transactions", getTransaction);
router.get("/transaction/getByid/:id", getTransactionById);
router.post("/transaction/approvedReject/:id", TransactionApproval);


module.exports = router;
