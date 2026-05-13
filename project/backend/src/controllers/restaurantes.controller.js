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
    const img = 'imagen_url' in req.body
      ? ((imagen_url || '').startsWith('http') ? imagen_url : null)
      : undefined;

    const sets = ['updated_at = NOW()'];
    const vals = [];
    let i = 1;
    if (nombre     !== undefined) { sets.unshift(`nombre=$${i++}`);      vals.push(nombre      || null); }
    if (descripcion !== undefined) { sets.unshift(`descripcion=$${i++}`); vals.push(descripcion || null); }
    if (img        !== undefined) { sets.unshift(`imagen_url=$${i++}`);  vals.push(img); }

    vals.push(req.params.id, req.user.id);
    await db.query(
      `UPDATE restaurantes SET ${sets.join(', ')} WHERE id=$${i++} AND usuario_id=$${i}`,
      vals
    );
    res.json({ message: 'Actualizado' });
  } catch(e) { console.error('update restaurante:', e.message); res.status(500).json({ error: 'Error al actualizar' }); }
}

module.exports = { getAll, getById, getMenu, create, update };
