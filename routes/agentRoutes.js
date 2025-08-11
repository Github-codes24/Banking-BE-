const express = require('express');
const router = express.Router();
const {
  registerAgent,

  getAgents,
  getAgent,
  updateAgent,
  deleteAgent

} = require('../controllers/agentController');
const { authCheck } = require('../middilewares/authCheck');
// const { protect, authorize } = require('../middleware/auth');

router.post('/register', authCheck, registerAgent);
// router.post('/login', loginAgent);

router.route('/')
  .get(  getAgents);

router.route('/:id')
  .get( getAgent)
  .put(authCheck, updateAgent)
  .delete(authCheck, deleteAgent);

// router.put('/:id/password', updatePassword);

module.exports = router;