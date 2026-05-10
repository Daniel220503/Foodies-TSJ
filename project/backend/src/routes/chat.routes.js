const router = require('express').Router();
const { authMiddleware, requireRole } = require('../config/auth.middleware');
const chatCtrl = require('../controllers/chat.controller');

// Chat público para alumnos (sin login requerido)
router.post('/', chatCtrl.chat);

// Chat privado para restaurantes (requiere login con rol restaurante)
router.post('/restaurante', authMiddleware, requireRole('restaurante'), chatCtrl.chatRestaurante);

module.exports = router;
