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
const upload = require("../utils/multer");
const { authCheck } = require("../middilewares/authCheck");

router.post("/register",authCheck,upload.single("signature"), registerManager);
router.post("/login", loginManager);

router.route("/",authCheck).get(getManagers);

router.route("/:id",authCheck).get(getManager).delete(deleteManager);
// router.route("/:id",upload.single("signature"),).put(updateManager);
router.put("/:id",authCheck, upload.single("signature"), updateManager);
router.post("/password-otp", updatePasswordOtp);
// router.put('/password-otp',  updatePasswordOtp);
router.post("/verify-otp", verifyOtp); 
router.post("/change-password", changePassword);
router.get("/agents/:managerId", authCheck, getAgents);
router.get("/agent/block/:agentId",authCheck, makeAgentBlock);
router.get("/agent/unblock/:agentId",authCheck, makeAgentUnBlock);
router.post("/password-change/:managerId", changeManagerPassword);

module.exports = router;
