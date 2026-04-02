const router = require('express').Router();
const ctrl   = require('../controllers/restaurantes.controller');
const { authMiddleware, requireRole } = require('../config/auth.middleware');
router.get('/',          ctrl.getAll);
router.get('/:id',       ctrl.getById);
router.get('/:id/menu',  ctrl.getMenu);
router.post('/',         authMiddleware, requireRole('restaurante'), ctrl.create);
router.put('/:id',       authMiddleware, requireRole('restaurante'), ctrl.update);
module.exports = router;
