const express = require("express");
const { rdTransaction ,getTransactionById,fdTransaction,getTransaction} = require("../controllers/transactionSchemesController");
const router = express.Router();


router.post("/rdTransaction", rdTransaction);
router.post("/fdTransaction", fdTransaction);
router.get("/transactions", getTransaction);
router.get("/transaction/getByid/:id", getTransactionById);


module.exports = router;
