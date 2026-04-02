const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'tsj_foodies_secret_2024';

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ error: 'Token requerido' });
  try {
    req.user = jwt.verify(header.split(' ')[1], JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.rol))
      return res.status(403).json({ error: 'Sin permiso para esta acción' });
    next();
  };
}

module.exports = { authMiddleware, requireRole };
