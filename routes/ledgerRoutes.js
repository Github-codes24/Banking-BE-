const express = require("express");
const {
  createLedger,
  getLedgers,
  getLedgerById,
  updateLedger,
  deleteLedger,
} = require("../controllers/ledgerController");

const router = express.Router();

router.post("/", createLedger);
router.get("/", getLedgers);
router.get("/:id", getLedgerById);
router.put("/:id", updateLedger);
router.delete("/:id", deleteLedger);

module.exports = router; // ✅ Correct for CommonJS
