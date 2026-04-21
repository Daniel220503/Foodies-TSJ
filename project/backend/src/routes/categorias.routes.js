const router = require('express').Router();
const db     = require('../config/db');
const { authMiddleware, requireRole } = require('../config/auth.middleware');

router.post('/', authMiddleware, requireRole('restaurante'), async (req, res) => {
  const { nombre } = req.body;
  const rid = req.user.restaurante_id;
  if (!nombre || !rid) return res.status(400).json({ error: 'Datos incompletos' });
  try {
    const { rows } = await db.query(
      'INSERT INTO categorias (restaurante_id,nombre) VALUES ($1,$2) RETURNING *', [rid, nombre]
    );
    res.status(201).json(rows[0]);
  } catch { res.status(500).json({ error: 'Error al crear categoría' }); }
});

router.delete('/:id', authMiddleware, requireRole('restaurante'), async (req, res) => {
  const rid = req.user.restaurante_id;
  try {
    await db.query('DELETE FROM categorias WHERE id=$1 AND restaurante_id=$2', [req.params.id, rid]);
    res.json({ message: 'Categoría eliminada' });
  } catch { res.status(500).json({ error: 'Error' }); }
});

module.exports = router;
