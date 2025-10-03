const express = require("express");
const { rdTransaction,rdPayout,lakhpatiEmiTransaction,LakhpatiPayout ,pigmyPayout,getTransactionById,fdPayout,savingAccountTransaction,pigmyEmiTransaction,loanEmiTransaction,fdTransaction,TransactionApproval,getTransaction} = require("../controllers/transactionSchemesController");

const { authCheck } = require("../middilewares/authCheck");
const router = express.Router();


router.post("/rdTransaction",authCheck, rdTransaction);
router.post("/fdTransaction", authCheck,fdTransaction);
router.post("/loanEmiTransaction",authCheck, loanEmiTransaction);
router.post("/pigmyEmiTransaction",authCheck, pigmyEmiTransaction);
router.post("/lakhpatiEmiTransaction",authCheck, lakhpatiEmiTransaction);
router.get("/transactions", authCheck, getTransaction);
router.get("/transaction/getByid/:id",authCheck, getTransactionById);
router.post("/transaction/savingAc",authCheck, savingAccountTransaction);
router.post("/transaction/FD/maturityPay",authCheck, fdPayout);
router.post("/transaction/RD/maturityPay",authCheck, rdPayout);
router.post("/transaction/pigmy/maturityPay",authCheck, pigmyPayout);
router.post("/transaction/Lakhpati/maturityPay",authCheck, LakhpatiPayout);
router.post("/transaction/approvedReject/:id",authCheck, TransactionApproval);


module.exports = router;
