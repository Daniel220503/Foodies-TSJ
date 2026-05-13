const db = require('../config/db');

async function create(req, res) {
  const { restaurante_id, items, notas } = req.body;
  if (!restaurante_id || !items?.length)
    return res.status(400).json({ error: 'Datos del pedido incompletos' });

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    let total = 0;
    const detalles = [];
    for (const item of items) {
      const cant = parseInt(item.cantidad, 10);
      if (!cant || cant < 1 || cant > 100)
        throw new Error('Cantidad inválida en uno de los productos (debe ser entre 1 y 100)');
      const { rows } = await client.query(
        'SELECT id, precio FROM productos WHERE id=$1 AND disponible=TRUE AND deleted_at IS NULL',
        [item.producto_id]
      );
      if (!rows.length) throw new Error(`Producto ${item.producto_id} no disponible`);
      const sub = parseFloat(rows[0].precio) * cant;
      total += sub;
      detalles.push({ ...item, cantidad: cant, precio_unitario: rows[0].precio, subtotal: sub });
    }

    // Prioridad dinámica: más pedidos activos = número mayor
    const { rows: [{ cnt }] } = await client.query(
      `SELECT COUNT(*)::int as cnt FROM pedidos
       WHERE restaurante_id=$1 AND estado IN ('pendiente','en_preparacion')`, [restaurante_id]
    );
    const prioridad = Math.min(10, cnt + 1);

    const { rows: [pedido] } = await client.query(
      `INSERT INTO pedidos (usuario_id,restaurante_id,total,prioridad,notas)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [req.user.id, restaurante_id, total.toFixed(2), prioridad, notas||null]
    );

    for (const d of detalles) {
      await client.query(
        `INSERT INTO detalle_pedido (pedido_id,producto_id,cantidad,precio_unitario,subtotal)
         VALUES ($1,$2,$3,$4,$5)`,
        [pedido.id, d.producto_id, d.cantidad, d.precio_unitario, d.subtotal]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ pedido_id: pedido.id, total: total.toFixed(2), prioridad });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message || 'Error al crear pedido' });
  } finally {
    client.release();
  }
}

async function misPedidos(req, res) {
  try {
    const { rows: pedidos } = await db.query(
      `SELECT p.*, r.nombre as restaurante_nombre,
              pa.metodo as metodo_pago, pa.estado as pago_estado
       FROM pedidos p
       JOIN restaurantes r ON p.restaurante_id=r.id
       LEFT JOIN pagos pa ON pa.pedido_id=p.id
       WHERE p.usuario_id=$1 ORDER BY p.created_at DESC`, [req.user.id]
    );
    for (const p of pedidos) {
      const { rows } = await db.query(
        `SELECT dp.*, pr.nombre as producto_nombre
         FROM detalle_pedido dp JOIN productos pr ON dp.producto_id=pr.id
         WHERE dp.pedido_id=$1`, [p.id]
      );
      p.items = rows;
    }
    res.json(pedidos);
  } catch { res.status(500).json({ error: 'Error al obtener pedidos' }); }
}

async function pedidosRestaurante(req, res) {
  const rid = req.user.restaurante_id;
  if (!rid) return res.status(400).json({ error: 'Sin restaurante asociado' });
  try {
    const { rows: pedidos } = await db.query(
      `SELECT p.*, u.nombre as cliente_nombre,
              pa.metodo as metodo_pago, pa.estado as pago_estado
       FROM pedidos p
       JOIN usuarios u ON p.usuario_id=u.id
       LEFT JOIN pagos pa ON pa.pedido_id=p.id
       WHERE p.restaurante_id=$1 ORDER BY p.prioridad ASC, p.created_at ASC`, [rid]
    );
    for (const p of pedidos) {
      const { rows } = await db.query(
        `SELECT dp.*, pr.nombre as producto_nombre
         FROM detalle_pedido dp JOIN productos pr ON dp.producto_id=pr.id
         WHERE dp.pedido_id=$1`, [p.id]
      );
      p.items = rows;
    }
    res.json(pedidos);
  } catch { res.status(500).json({ error: 'Error al obtener pedidos' }); }
}

async function updateEstado(req, res) {
  const { estado } = req.body;
  const validos = ['pendiente','en_preparacion','listo','entregado','cancelado'];
  if (!validos.includes(estado)) return res.status(400).json({ error: 'Estado inválido' });
  const rid = req.user.restaurante_id;
  if (!rid) return res.status(403).json({ error: 'Sin restaurante asociado' });
  try {
    const { rowCount } = await db.query(
      'UPDATE pedidos SET estado=$1, updated_at=NOW() WHERE id=$2 AND restaurante_id=$3',
      [estado, req.params.id, rid]
    );
    if (!rowCount) return res.status(404).json({ error: 'Pedido no encontrado' });
    res.json({ message: 'Estado actualizado' });
  } catch { res.status(500).json({ error: 'Error' }); }
}

module.exports = { create, misPedidos, pedidosRestaurante, updateEstado };
