// ── auth.routes.js ──────────────────────────────────────────
const authRouter = require('express').Router();
const authCtrl   = require('../controllers/auth.controller');
const { authMiddleware } = require('../config/auth.middleware');
authRouter.post('/register', authCtrl.register);
authRouter.post('/login',    authCtrl.login);
authRouter.get('/me',        authMiddleware, authCtrl.me);
module.exports = { authRouter };
