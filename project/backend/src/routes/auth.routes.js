const router = require('express').Router();
const ctrl   = require('../controllers/auth.controller');
const { authMiddleware } = require('../config/auth.middleware');
router.post('/register', ctrl.register);
router.post('/login',    ctrl.login);
router.get('/me',        authMiddleware, ctrl.me);
module.exports = router;
