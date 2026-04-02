const db = require('../config/db');

async function create(req, res) {
  const { nombre, descripcion, precio, imagen_url, categoria_id, tiempo_estimado } = req.body;
  if (!nombre || !precio) return res.status(400).json({ error: 'Nombre y precio requeridos' });
  const rid = req.user.restaurante_id;
  if (!rid) return res.status(400).json({ error: 'Sin restaurante asociado' });
  try {
    const { rows } = await db.query(
      `INSERT INTO productos (restaurante_id,categoria_id,nombre,descripcion,precio,imagen_url,tiempo_estimado)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [rid, categoria_id||null, nombre, descripcion||null, precio, imagen_url||null, tiempo_estimado||15]
    );
    res.status(201).json({ id: rows[0].id, message: 'Producto creado' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error al crear producto' }); }
}

async function update(req, res) {
  const { nombre, descripcion, precio, imagen_url, categoria_id, tiempo_estimado, disponible } = req.body;
  const rid = req.user.restaurante_id;
  try {
    await db.query(
      `UPDATE productos SET
        nombre         = COALESCE($1, nombre),
        descripcion    = COALESCE($2, descripcion),
        precio         = COALESCE($3, precio),
        imagen_url     = COALESCE($4, imagen_url),
        categoria_id   = COALESCE($5, categoria_id),
        tiempo_estimado= COALESCE($6, tiempo_estimado),
        disponible     = COALESCE($7, disponible)
       WHERE id=$8 AND restaurante_id=$9 AND deleted_at IS NULL`,
      [nombre||null, descripcion||null, precio||null, imagen_url||null,
       categoria_id||null, tiempo_estimado||null, disponible??null, req.params.id, rid]
    );
    res.json({ message: 'Producto actualizado' });
  } catch { res.status(500).json({ error: 'Error al actualizar' }); }
}

async function remove(req, res) {
  const rid = req.user.restaurante_id;
  try {
    await db.query(
      'UPDATE productos SET deleted_at=NOW() WHERE id=$1 AND restaurante_id=$2',
      [req.params.id, rid]
    );
    res.json({ message: 'Producto eliminado' });
  } catch { res.status(500).json({ error: 'Error al eliminar' }); }
}

module.exports = { create, update, remove };
