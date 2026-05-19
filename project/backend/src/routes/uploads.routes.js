const router = require('express').Router();
const ctrl = require('../controllers/uploads.controller');
const { authMiddleware, requireRole } = require('../config/auth.middleware');

router.post(
  '/image',
  authMiddleware,
  requireRole('restaurante', 'admin'),
  ctrl.uploadMiddleware,
  ctrl.uploadImage
);

module.exports = router;
