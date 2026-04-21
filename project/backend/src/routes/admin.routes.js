const router = require('express').Router();
const ctrl   = require('../controllers/admin.controller');
const { authMiddleware, requireRole } = require('../config/auth.middleware');

router.use(authMiddleware, requireRole('admin'));

router.get('/stats',                              ctrl.getStats);

// Usuarios
router.get('/usuarios',                           ctrl.getUsuarios);
router.patch('/usuarios/:id/toggle',              ctrl.toggleUsuario);

// Restaurantes CRUD
router.get('/restaurantes',                       ctrl.getRestaurantes);
router.post('/restaurantes',                      ctrl.crearRestaurante);
router.put('/restaurantes/:id',                   ctrl.actualizarRestaurante);
router.delete('/restaurantes/:id',                ctrl.eliminarRestaurante);
router.patch('/restaurantes/:id/aprobar',         ctrl.aprobarRestaurante);
router.patch('/restaurantes/:id/toggle',          ctrl.toggleRestaurante);

// Productos
router.get('/restaurantes/:id/productos',         ctrl.getProductos);
router.post('/restaurantes/:id/productos',        ctrl.crearProducto);
router.put('/restaurantes/:id/productos/:pid',    ctrl.actualizarProducto);
router.delete('/restaurantes/:id/productos/:pid', ctrl.eliminarProducto);

// Pedidos
router.get('/pedidos',                            ctrl.getAllPedidos);

module.exports = router;
