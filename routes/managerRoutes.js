const express = require('express');
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
  getAgents
} = require('../controllers/managerController');
const { authCheck } = require('../middilewares/authCheck');


router.post('/register', registerManager);
router.post('/login', loginManager);

router.route('/')
  .get( getManagers);

router.route('/:id')
  .get( getManager)
  .put( updateManager)
  .delete( deleteManager);

router.post('/password-otp',  updatePasswordOtp);
// router.put('/password-otp',  updatePasswordOtp);
router.post("/verify-otp", verifyOtp);
router.post("/change-password", changePassword);
router.get("/agents", authCheck, getAgents);

module.exports = router;