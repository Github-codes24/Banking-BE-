const express = require("express");
const { rdTransaction ,getTransactionById,savingAccountTransaction,pigmyEmiTransaction,loanEmiTransaction,fdTransaction,TransactionApproval,getTransaction} = require("../controllers/transactionSchemesController");

const { authCheck } = require("../middilewares/authCheck");
const router = express.Router();


router.post("/rdTransaction",authCheck, rdTransaction);
router.post("/fdTransaction", authCheck,fdTransaction);
router.post("/loanEmiTransaction",authCheck, loanEmiTransaction);
router.post("/pigmyEmiTransaction",authCheck, pigmyEmiTransaction);
router.get("/transactions", authCheck, getTransaction);
router.get("/transaction/getByid/:id",authCheck, getTransactionById);
router.post("/transaction/savingAc",authCheck, savingAccountTransaction);
router.post("/transaction/approvedReject/:id",authCheck, TransactionApproval);


module.exports = router;
