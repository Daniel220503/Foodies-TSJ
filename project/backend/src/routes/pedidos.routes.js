const router = require('express').Router();
const ctrl   = require('../controllers/pedidos.controller');
const { authMiddleware, requireRole } = require('../config/auth.middleware');

router.post('/',             authMiddleware, requireRole('cliente'),               ctrl.create);
router.get('/mis-pedidos',   authMiddleware, requireRole('cliente'),               ctrl.misPedidos);
router.get('/restaurante',   authMiddleware, requireRole('restaurante'),           ctrl.pedidosRestaurante);
router.patch('/:id/estado',  authMiddleware, requireRole('restaurante','admin'),   ctrl.updateEstado);

module.exports = router;
