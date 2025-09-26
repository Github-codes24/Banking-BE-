const express = require("express");
const router = express.Router();
const agentController = require("../controllers/agentController");
const upload = require("../utils/multer");
const { authCheck } = require("../middilewares/authCheck");
router.post("/", authCheck ,upload.single("signature"), agentController.createAgent);
router.get("/", authCheck ,agentController.getAgents);
router.get("/:id",authCheck, agentController.getAgentById);
router.put("/:id", authCheck ,upload.single("signature"), agentController.updateAgent);
router.delete("/:id",authCheck, agentController.deleteAgent);
router.post("/login", agentController.loginAgent);
router.get("/getCoustomer/:agentId", agentController.getCustomer);
router.put("/update/info/:agentId", agentController.updateAgentMinimalInfo);

module.exports = router;
