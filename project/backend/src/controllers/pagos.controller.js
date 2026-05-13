const db = require('../config/db');

function generarFolio() {
  const ts   = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `TSJ-${ts}${rand}`;
}

async function procesarPago(req, res) {
  const { pedido_id, metodo } = req.body;
  if (!pedido_id || !metodo)
    return res.status(400).json({ error: 'Datos de pago incompletos' });

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // FOR UPDATE previene que dos solicitudes simultáneas procesen el mismo pedido
    const { rows: pedidos } = await client.query(
      'SELECT * FROM pedidos WHERE id=$1 AND usuario_id=$2 FOR UPDATE', [pedido_id, req.user.id]
    );
    if (!pedidos.length) throw new Error('Pedido no encontrado');
    const pedido = pedidos[0];

    const { rows: pagos } = await client.query(
      "SELECT id, estado FROM pagos WHERE pedido_id=$1", [pedido_id]
    );
    const pagoExistente = pagos[0];
    if (pagoExistente?.estado === 'completado') throw new Error('El pedido ya fue pagado');
    // Si quedó un pago MP pendiente (usuario canceló en MP), reemplazarlo con efectivo
    if (pagoExistente) {
      await client.query('DELETE FROM pagos WHERE pedido_id=$1', [pedido_id]);
    }

    const referencia = `REF-${Date.now()}`;
    await client.query(
      `INSERT INTO pagos (pedido_id,metodo,monto,estado,referencia)
       VALUES ($1,$2,$3,'completado',$4)`,
      [pedido_id, metodo, pedido.total, referencia]
    );

    await client.query(
      "UPDATE pedidos SET estado='en_preparacion', updated_at=NOW() WHERE id=$1", [pedido_id]
    );

    // Datos para comprobante
    const { rows: detalles } = await client.query(
      `SELECT dp.cantidad, dp.precio_unitario, dp.subtotal, pr.nombre
       FROM detalle_pedido dp JOIN productos pr ON dp.producto_id=pr.id
       WHERE dp.pedido_id=$1`, [pedido_id]
    );
    const { rows: [usuario] } = await client.query(
      'SELECT nombre, email FROM usuarios WHERE id=$1', [req.user.id]
    );
    const { rows: [rest] } = await client.query(
      'SELECT nombre FROM restaurantes WHERE id=$1', [pedido.restaurante_id]
    );

    const folio = generarFolio();
    const contenido = {
      folio,
      fecha: new Date().toISOString(),
      usuario,
      restaurante: rest.nombre,
      items: detalles,
      total: pedido.total,
      metodo_pago: metodo,
      referencia
    };

    await client.query(
      'INSERT INTO comprobantes (pedido_id,folio,contenido_json) VALUES ($1,$2,$3)',
      [pedido_id, folio, JSON.stringify(contenido)]
    );

    await client.query('COMMIT');
    res.json({ message: 'Pago exitoso', folio, comprobante: contenido });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message || 'Error al procesar pago' });
  } finally {
    client.release();
  }
}

async function getComprobante(req, res) {
  try {
    const { rows } = await db.query(
      `SELECT c.* FROM comprobantes c
       JOIN pedidos p ON c.pedido_id = p.id
       WHERE c.pedido_id=$1 AND p.usuario_id=$2`,
      [req.params.pedidoId, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Comprobante no encontrado' });
    res.json(rows[0]);
  } catch { res.status(500).json({ error: 'Error' }); }
}

module.exports = { procesarPago, getComprobante };
