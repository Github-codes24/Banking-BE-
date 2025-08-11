const express = require('express');
const router = express.Router();
const {
  registerManager,
  loginManager,
  getManagers,
  getManager,
  updateManager,
  deleteManager,
  updatePassword
} = require('../controllers/managerController');


router.post('/register', registerManager);
router.post('/login', loginManager);

router.route('/')
  .get( getManagers);

router.route('/:id')
  .get( getManager)
  .put( updateManager)
  .delete( deleteManager);

router.put('/:id/password',  updatePassword);

module.exports = router;