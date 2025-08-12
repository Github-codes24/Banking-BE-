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
  changePassword
} = require('../controllers/managerController');


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

module.exports = router;