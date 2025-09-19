const express = require("express");
const router = express.Router();
const {
  registerManager,
  loginManager,
  getManagers,
  getManager,
  updateManager,
  deleteManager,
  updatePasswordOtp,
  verifyOtp,
  changePassword,
  getAgents,
  changeManagerPassword,
  makeAgentBlock,
  makeAgentUnBlock
} = require("../controllers/managerController");
const { authCheck } = require("../middilewares/authCheck");

router.post("/register", registerManager);
router.post("/login", loginManager);

router.route("/").get(getManagers);

router.route("/:id").get(getManager).put(updateManager).delete(deleteManager);

router.post("/password-otp", updatePasswordOtp);
// router.put('/password-otp',  updatePasswordOtp);
router.post("/verify-otp", verifyOtp);
router.post("/change-password", changePassword);
router.get("/agents/:managerId", getAgents);
router.post("/agent/block/:agentId", makeAgentBlock);
router.post("/agent/unblock/:agentId", makeAgentUnBlock);
router.post("/password-change/:managerId", changeManagerPassword);

module.exports = router;
