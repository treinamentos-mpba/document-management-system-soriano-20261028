const express = require('express');
const authController = require('../controllers/auth.controller');
const {
  requireAuthenticated,
  requireSameOrigin,
} = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/auth/login', requireSameOrigin, authController.login);
router.get('/auth/me', requireAuthenticated, authController.currentUser);
router.post(
  '/auth/logout',
  requireSameOrigin,
  requireAuthenticated,
  authController.logout
);

module.exports = router;
