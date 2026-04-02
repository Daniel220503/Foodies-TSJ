const db = require('../config/db');

async function getAll(req, res) {
  try {
    const { rows } = await db.query(
      `SELECT r.*, u.nombre as propietario
       FROM restaurantes r JOIN usuarios u ON r.usuario_id=u.id
       WHERE r.activo=TRUE AND r.aprobado=TRUE ORDER BY r.nombre`
    );
    res.json(rows);
  } catch { res.status(500).json({ error: 'Error al obtener restaurantes' }); }
}

async function getById(req, res) {
  try {
    const { rows } = await db.query(
      `SELECT r.*, u.nombre as propietario
       FROM restaurantes r JOIN usuarios u ON r.usuario_id=u.id
       WHERE r.id=$1`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch { res.status(500).json({ error: 'Error' }); }
}

async function getMenu(req, res) {
  try {
    const { rows: categorias } = await db.query(
      'SELECT * FROM categorias WHERE restaurante_id=$1 ORDER BY nombre', [req.params.id]
    );
    const { rows: productos } = await db.query(
      `SELECT * FROM productos
       WHERE restaurante_id=$1 AND disponible=TRUE AND deleted_at IS NULL
       ORDER BY categoria_id, nombre`, [req.params.id]
    );
    res.json({ categorias, productos });
  } catch { res.status(500).json({ error: 'Error al obtener menú' }); }
}

async function create(req, res) {
  const { nombre, descripcion, imagen_url } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
  try {
    const { rows } = await db.query(
      'INSERT INTO restaurantes (usuario_id,nombre,descripcion,imagen_url) VALUES ($1,$2,$3,$4) RETURNING id',
      [req.user.id, nombre, descripcion || null, imagen_url || null]
    );
    res.status(201).json({ id: rows[0].id, message: 'Restaurante creado. Pendiente de aprobación.' });
  } catch { res.status(500).json({ error: 'Error al crear restaurante' }); }
}

async function update(req, res) {
  const { nombre, descripcion, imagen_url } = req.body;
  try {
    await db.query(
      `UPDATE restaurantes SET
        nombre      = COALESCE($1, nombre),
        descripcion = COALESCE($2, descripcion),
        imagen_url  = COALESCE($3, imagen_url),
        updated_at  = NOW()
       WHERE id=$4 AND usuario_id=$5`,
      [nombre||null, descripcion||null, imagen_url||null, req.params.id, req.user.id]
    );
    res.json({ message: 'Actualizado' });
  } catch { res.status(500).json({ error: 'Error al actualizar' }); }
}

module.exports = { getAll, getById, getMenu, create, update };
