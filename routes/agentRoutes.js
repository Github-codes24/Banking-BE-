const express = require("express");
const router = express.Router();
const agentController = require("../controllers/agentController");
const upload = require("../utils/multer");
router.post("/", upload.single("signature"), agentController.createAgent);
router.get("/", agentController.getAgents);
router.get("/:id", agentController.getAgentById);
router.put("/:id", upload.single("signature"), agentController.updateAgent);
router.delete("/:id", agentController.deleteAgent);
router.post("/login", agentController.loginAgent);
router.get("/getCoustomer/:agentId", agentController.getCustomer);
router.put("/update/info/:agentId", agentController.updateAgentMinimalInfo);

module.exports = router;
