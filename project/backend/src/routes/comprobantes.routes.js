const router = require('express').Router();
const { getComprobante } = require('../controllers/pagos.controller');
const { authMiddleware } = require('../config/auth.middleware');
router.get('/:pedidoId', authMiddleware, getComprobante);
module.exports = router;
