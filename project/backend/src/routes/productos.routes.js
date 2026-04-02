// productos.routes.js
const router = require('express').Router();
const ctrl   = require('../controllers/productos.controller');
const { authMiddleware, requireRole } = require('../config/auth.middleware');
router.post('/',     authMiddleware, requireRole('restaurante'), ctrl.create);
router.put('/:id',   authMiddleware, requireRole('restaurante'), ctrl.update);
router.delete('/:id',authMiddleware, requireRole('restaurante'), ctrl.remove);
module.exports = router;
