'use strict';
const router = require('express').Router();
const { authMiddleware, requireRole } = require('../config/auth.middleware');
const mp = require('../controllers/mp.controller');

// Crear preferencia: solo clientes autenticados
router.post('/preferencia', authMiddleware, requireRole('cliente'), mp.crearPreferencia);

// Verificar pago tras el redirect de MP: usuario autenticado
router.post('/verificar', authMiddleware, mp.verificarPago);

// Webhook IPN de Mercado Pago: sin autenticación JWT
router.post('/webhook', mp.webhook);

module.exports = router;
