const Ledger = require("../models/ledgerModel");

// Create Ledger
exports.createLedger = async (req, res) => {
  try {
    const ledger = new Ledger(req.body);
    await ledger.save();
    res.status(201).json({ success: true, data: ledger });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Get All Ledgers
exports.getLedgers = async (req, res) => {
  try {
    const ledgers = await Ledger.find();
    res.status(200).json({ success: true, data: ledgers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get Single Ledger
exports.getLedgerById = async (req, res) => {
  try {
    const ledger = await Ledger.findById(req.params.id);
    if (!ledger) return res.status(404).json({ success: false, message: "Ledger not found" });
    res.status(200).json({ success: true, data: ledger });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update Ledger
exports.updateLedger = async (req, res) => {
  try {
    const ledger = await Ledger.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!ledger) return res.status(404).json({ success: false, message: "Ledger not found" });
    res.status(200).json({ success: true, data: ledger });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Delete Ledger
exports.deleteLedger = async (req, res) => {
  try {
    const ledger = await Ledger.findByIdAndDelete(req.params.id);
    if (!ledger) return res.status(404).json({ success: false, message: "Ledger not found" });
    res.status(200).json({ success: true, message: "Ledger deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
