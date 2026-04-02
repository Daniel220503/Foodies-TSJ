const bcrypt = require('bcrypt');
const db     = require('../config/db');

/* ── STATS ──────────────────────────────────────── */
async function getStats(req, res) {
  try {
    const { rows:[s] } = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM pedidos)::int                                  AS total_pedidos,
        (SELECT COUNT(*) FROM usuarios WHERE rol='cliente')::int             AS total_usuarios,
        (SELECT COUNT(*) FROM restaurantes WHERE activo=TRUE)::int           AS total_restaurantes,
        (SELECT COALESCE(SUM(monto),0) FROM pagos WHERE estado='completado') AS ingresos_totales
    `);
    res.json(s);
  } catch(e) { console.error('getStats:', e.message); res.status(500).json({ error: 'Error' }); }
}

/* ── USUARIOS ────────────────────────────────────── */
async function getUsuarios(req, res) {
  try {
    const { rows } = await db.query(
      `SELECT id, nombre, email, rol, activo, created_at
       FROM usuarios ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch(e) { console.error('getUsuarios:', e.message); res.status(500).json({ error: 'Error' }); }
}

async function toggleUsuario(req, res) {
  try {
    const { rowCount } = await db.query(
      'UPDATE usuarios SET activo=NOT activo WHERE id=$1', [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ message: 'Estado actualizado' });
  } catch(e) { console.error('toggleUsuario:', e.message); res.status(500).json({ error: 'Error' }); }
}

/* ── RESTAURANTES CRUD ───────────────────────────── */
async function getRestaurantes(req, res) {
  try {
    const { rows } = await db.query(`
      SELECT r.id, r.nombre, r.descripcion, r.imagen_url,
             r.activo, r.aprobado, r.created_at,
             u.id AS usuario_id, u.nombre AS propietario, u.email
      FROM restaurantes r
      JOIN usuarios u ON r.usuario_id = u.id
      ORDER BY r.created_at DESC
    `);
    res.json(rows);
  } catch(e) { console.error('getRestaurantes:', e.message); res.status(500).json({ error: 'Error' }); }
}

/**
 * NUEVO: El admin crea restaurante + usuario propietario en un solo paso.
 * Body: { nombre, descripcion?, imagen_url?, email_propietario, password_propietario, nombre_propietario }
 */
async function crearRestaurante(req, res) {
  const {
    nombre, descripcion, imagen_url,
    nombre_propietario, email_propietario, password_propietario
  } = req.body;

  if (!nombre?.trim())
    return res.status(400).json({ error: 'El nombre del restaurante es obligatorio' });
  if (!nombre_propietario?.trim())
    return res.status(400).json({ error: 'El nombre del propietario es obligatorio' });
  if (!email_propietario?.trim())
    return res.status(400).json({ error: 'El correo del propietario es obligatorio' });
  if (!password_propietario || password_propietario.length < 6)
    return res.status(400).json({ error: 'La contraseña debe tener mínimo 6 caracteres' });

  const email = email_propietario.toLowerCase().trim();
  const pass  = password_propietario;

  try {
    // Verificar que el correo no esté en uso
    const { rows: existe } = await db.query(
      'SELECT id FROM usuarios WHERE email=$1', [email]
    );
    if (existe.length)
      return res.status(409).json({ error: 'Ese correo ya está registrado en el sistema' });

    // Crear usuario propietario con rol restaurante
    const hash = await bcrypt.hash(pass, 10);
    const { rows: nuevoUser } = await db.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol)
       VALUES ($1,$2,$3,'restaurante') RETURNING id`,
      [nombre_propietario.trim(), email, hash]
    );
    const usuario_id = nuevoUser[0].id;

    // Crear el restaurante vinculado al usuario
    const { rows: nuevoRest } = await db.query(
      `INSERT INTO restaurantes (usuario_id, nombre, descripcion, imagen_url, aprobado, activo)
       VALUES ($1,$2,$3,$4,TRUE,TRUE) RETURNING id`,
      [usuario_id, nombre.trim(), descripcion?.trim() || null, imagen_url || null]
    );

    res.status(201).json({
      id: nuevoRest[0].id,
      message: `Restaurante "${nombre}" creado. El propietario puede iniciar sesión con ${email}`
    });
  } catch(e) {
    console.error('crearRestaurante:', e.message);
    res.status(500).json({ error: 'Error al crear restaurante: ' + e.message });
  }
}

async function actualizarRestaurante(req, res) {
  const { nombre, descripcion, imagen_url } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });
  try {
    const img = (imagen_url || '').startsWith('http') ? imagen_url : null;
    const { rowCount } = await db.query(
      `UPDATE restaurantes SET
         nombre      = $1,
         descripcion = $2,
         imagen_url  = $3,
         updated_at  = NOW()
       WHERE id = $4`,
      [nombre.trim(), descripcion?.trim() || null, img, req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Restaurante no encontrado' });
    res.json({ message: 'Restaurante actualizado' });
  } catch(e) { console.error('actualizarRestaurante:', e.message); res.status(500).json({ error: 'Error' }); }
}

async function eliminarRestaurante(req, res) {
  try {
    const { rowCount } = await db.query(
      'UPDATE restaurantes SET activo=FALSE, updated_at=NOW() WHERE id=$1', [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Restaurante no encontrado' });
    res.json({ message: 'Restaurante eliminado' });
  } catch(e) { console.error('eliminarRestaurante:', e.message); res.status(500).json({ error: 'Error' }); }
}

async function aprobarRestaurante(req, res) {
  try {
    await db.query(
      'UPDATE restaurantes SET aprobado=TRUE, activo=TRUE, updated_at=NOW() WHERE id=$1',
      [req.params.id]
    );
    res.json({ message: 'Restaurante aprobado' });
  } catch(e) { console.error('aprobarRestaurante:', e.message); res.status(500).json({ error: 'Error' }); }
}

async function toggleRestaurante(req, res) {
  try {
    await db.query(
      'UPDATE restaurantes SET activo=NOT activo, updated_at=NOW() WHERE id=$1', [req.params.id]
    );
    res.json({ message: 'Estado actualizado' });
  } catch(e) { console.error('toggleRestaurante:', e.message); res.status(500).json({ error: 'Error' }); }
}

/* ── PRODUCTOS CRUD ──────────────────────────────── */
async function getProductos(req, res) {
  try {
    const { rows } = await db.query(`
      SELECT p.id, p.nombre, p.descripcion, p.precio, p.imagen_url,
             p.tiempo_estimado, p.disponible, p.categoria_id,
             c.nombre AS categoria_nombre
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.restaurante_id=$1 AND p.deleted_at IS NULL
      ORDER BY c.nombre NULLS LAST, p.nombre
    `, [req.params.id]);
    res.json(rows);
  } catch(e) { console.error('getProductos:', e.message); res.status(500).json({ error: 'Error' }); }
}

async function crearProducto(req, res) {
  const rid = parseInt(req.params.id, 10);
  const { nombre, descripcion, precio, imagen_url, categoria_id, tiempo_estimado } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });
  const precioNum = parseFloat(precio);
  if (isNaN(precioNum) || precioNum <= 0) return res.status(400).json({ error: 'El precio debe ser mayor a 0' });
  try {
    const { rows } = await db.query(`
      INSERT INTO productos (restaurante_id,categoria_id,nombre,descripcion,precio,imagen_url,tiempo_estimado)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id
    `, [rid, categoria_id ? parseInt(categoria_id) : null, nombre.trim(),
        descripcion?.trim() || null, precioNum, imagen_url || null, parseInt(tiempo_estimado)||15]);
    res.status(201).json({ id: rows[0].id, message: 'Producto creado' });
  } catch(e) { console.error('crearProducto:', e.message); res.status(500).json({ error: 'Error al crear producto' }); }
}

async function actualizarProducto(req, res) {
  const rid = parseInt(req.params.id, 10);
  const pid = parseInt(req.params.pid, 10);
  const { nombre, descripcion, precio, imagen_url, categoria_id, tiempo_estimado, disponible } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });
  const precioNum = parseFloat(precio);
  if (isNaN(precioNum) || precioNum <= 0) return res.status(400).json({ error: 'El precio debe ser mayor a 0' });
  try {
    const { rowCount } = await db.query(`
      UPDATE productos SET
        nombre=$1, descripcion=$2, precio=$3, imagen_url=$4,
        categoria_id=$5, tiempo_estimado=$6, disponible=$7
      WHERE id=$8 AND restaurante_id=$9 AND deleted_at IS NULL
    `, [nombre.trim(), descripcion?.trim()||null, precioNum, imagen_url||null,
        categoria_id ? parseInt(categoria_id) : null, parseInt(tiempo_estimado)||15,
        disponible === true || disponible === 'true', pid, rid]);
    if (!rowCount) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ message: 'Producto actualizado' });
  } catch(e) { console.error('actualizarProducto:', e.message); res.status(500).json({ error: 'Error' }); }
}

async function eliminarProducto(req, res) {
  try {
    const { rowCount } = await db.query(
      'UPDATE productos SET deleted_at=NOW() WHERE id=$1 AND restaurante_id=$2 AND deleted_at IS NULL',
      [parseInt(req.params.pid), parseInt(req.params.id)]
    );
    if (!rowCount) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ message: 'Producto eliminado' });
  } catch(e) { console.error('eliminarProducto:', e.message); res.status(500).json({ error: 'Error' }); }
}

/* ── PEDIDOS ─────────────────────────────────────── */
async function getAllPedidos(req, res) {
  try {
    const { rows } = await db.query(`
      SELECT p.id, p.total, p.estado, p.prioridad, p.created_at,
             u.nombre AS cliente, r.nombre AS restaurante
      FROM pedidos p
      JOIN usuarios    u ON p.usuario_id     = u.id
      JOIN restaurantes r ON p.restaurante_id = r.id
      ORDER BY p.created_at DESC LIMIT 200
    `);
    res.json(rows);
  } catch(e) { console.error('getAllPedidos:', e.message); res.status(500).json({ error: 'Error' }); }
}

module.exports = {
  getStats,
  getUsuarios, toggleUsuario,
  getRestaurantes, crearRestaurante, actualizarRestaurante,
  eliminarRestaurante, aprobarRestaurante, toggleRestaurante,
  getProductos, crearProducto, actualizarProducto, eliminarProducto,
  getAllPedidos
};
