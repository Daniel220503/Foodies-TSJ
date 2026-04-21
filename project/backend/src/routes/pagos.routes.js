const router = require('express').Router();
const { procesarPago } = require('../controllers/pagos.controller');
const { authMiddleware, requireRole } = require('../config/auth.middleware');
router.post('/', authMiddleware, requireRole('cliente'), procesarPago);
module.exports = router;
