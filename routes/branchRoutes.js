const express = require("express");
const router = express.Router();
const branchController = require("../controllers/branchControllers");

// CRUD routes
router.post("/", branchController.createBranch);
router.get("/", branchController.getBranches);
router.get("/:id", branchController.getBranchById);
router.put("/:id", branchController.updateBranch);
router.delete("/:id", branchController.deleteBranch);

module.exports = router;

// Create branch → POST /api/branches

// Get branches (search) → GET /api/branch?name=bangalore&page=1&limit=5

// Get branch by ID → GET /api/branch/:id

// Update branch → PUT /api/branch/:id

// Delete branch → DELETE /api/branch/:id