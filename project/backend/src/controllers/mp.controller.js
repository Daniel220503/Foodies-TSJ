'use strict';
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const db = require('../config/db');

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN || ''
});

function generarFolio() {
  return `TSJ-${Math.floor(10000 + Math.random() * 90000)}`;
}

/**
 * POST /api/mp/preferencia
 * Crea el pedido en BD y una preferencia en Mercado Pago.
 * Devuelve checkout_url para redirigir al usuario al Checkout Pro.
 */
async function crearPreferencia(req, res) {
  // Verificar token de MP antes de tocar la DB
  if (!process.env.MP_ACCESS_TOKEN) {
    return res.status(503).json({ error: 'El pago con Mercado Pago no está disponible en este entorno. Usa el pago en efectivo.' });
  }

  const { restaurante_id, items, notas } = req.body;
  const usuario_id = req.user.id;

  if (!restaurante_id || !Array.isArray(items) || !items.length)
    return res.status(400).json({ error: 'Tu carrito está vacío o no se seleccionó un restaurante. Intenta de nuevo.' });

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Verificar restaurante activo y aprobado
    const { rows: rests } = await client.query(
      'SELECT id FROM restaurantes WHERE id=$1 AND activo=true AND aprobado=true',
      [restaurante_id]
    );
    if (!rests.length) throw new Error('El restaurante seleccionado no está disponible en este momento.');

    // Obtener datos de productos y calcular total
    const ids = items.map(i => i.producto_id);
    const { rows: productos } = await client.query(
      'SELECT id, nombre, precio FROM productos WHERE id=ANY($1) AND disponible=true',
      [ids]
    );

    let total = 0;
    const detalles = items.map(item => {
      const prod = productos.find(p => p.id === item.producto_id);
      if (!prod) throw new Error('Uno de los productos ya no está disponible. Actualiza tu carrito e intenta de nuevo.');
      const subtotal = parseFloat(prod.precio) * item.cantidad;
      total += subtotal;
      return { producto_id: item.producto_id, cantidad: item.cantidad, nombre: prod.nombre, precio: prod.precio, subtotal };
    });

    // Crear pedido
    const { rows: [pedido] } = await client.query(
      `INSERT INTO pedidos (usuario_id, restaurante_id, total, notas) VALUES ($1,$2,$3,$4) RETURNING id`,
      [usuario_id, restaurante_id, total.toFixed(2), notas || null]
    );

    for (const d of detalles) {
      await client.query(
        `INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario, subtotal) VALUES ($1,$2,$3,$4,$5)`,
        [pedido.id, d.producto_id, d.cantidad, parseFloat(d.precio).toFixed(2), d.subtotal.toFixed(2)]
      );
    }

    await client.query(
      `INSERT INTO pagos (pedido_id, metodo, monto, estado) VALUES ($1,'mercadopago',$2,'pendiente')`,
      [pedido.id, total.toFixed(2)]
    );

    // Llamar a MP ANTES de hacer COMMIT para poder hacer ROLLBACK si falla
    const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    const preference = new Preference(mpClient);
    const pref = await preference.create({
      body: {
        items: detalles.map(d => ({
          id: String(d.producto_id),
          title: d.nombre,
          quantity: d.cantidad,
          unit_price: parseFloat(d.precio),
          currency_id: 'MXN'
        })),
        external_reference: String(pedido.id),
        back_urls: {
          success: `${baseUrl}/src/pages/alumno/pago-resultado.html`,
          failure: `${baseUrl}/src/pages/alumno/pago-resultado.html`,
          pending: `${baseUrl}/src/pages/alumno/pago-resultado.html`
        },
        statement_descriptor: 'TSJ Foodies'
      }
    });

    // MP OK → guardar referencia y hacer COMMIT
    await client.query('UPDATE pagos SET referencia=$1 WHERE pedido_id=$2', [pref.id, pedido.id]);
    await client.query('COMMIT');

    const isTest = (process.env.MP_ACCESS_TOKEN || '').startsWith('TEST-');
    const checkout_url = isTest ? pref.sandbox_init_point : pref.init_point;
    res.json({ pedido_id: pedido.id, checkout_url });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[MP crearPreferencia]', err?.cause ?? err);
    const esErrorPropio = err.message.includes('restaurante') || err.message.includes('producto') || err.message.includes('carrito');
    res.status(500).json({ error: esErrorPropio ? err.message : 'No se pudo procesar el pago. Por favor intenta de nuevo en unos momentos.' });
  } finally {
    client.release();
  }
}

/**
 * POST /api/mp/verificar
 * El frontend llama este endpoint después del redirect de Mercado Pago.
 * Consulta el estado del pago con la API de MP, actualiza la BD
 * y genera el comprobante si el pago fue aprobado.
 */
async function verificarPago(req, res) {
  const { payment_id, external_reference } = req.body;
  if (!payment_id || !external_reference)
    return res.status(400).json({ error: 'No se encontró información del pago. Regresa al inicio e intenta de nuevo.' });

  const pedido_id = parseInt(external_reference, 10);
  const dbClient  = await db.connect();

  try {
    await dbClient.query('BEGIN');

    // Verificar que el pedido pertenece al usuario autenticado
    const { rows: pedidos } = await dbClient.query(
      'SELECT * FROM pedidos WHERE id=$1 AND usuario_id=$2',
      [pedido_id, req.user.id]
    );
    if (!pedidos.length) throw new Error('No encontramos tu pedido. Revisa el historial de pedidos para verificar el estado.');
    const pedido = pedidos[0];

    // Consultar estado del pago en Mercado Pago
    const payment = new Payment(mpClient);
    const mpPayment = await payment.get({ id: payment_id });

    if (String(mpPayment.external_reference) !== String(pedido_id))
      throw new Error('La información del pago no corresponde a este pedido. Contacta a soporte si el cargo fue realizado.');

    const estadoMp   = mpPayment.status; // approved | pending | rejected
    const estadoPago =
      estadoMp === 'approved' ? 'completado' :
      estadoMp === 'pending'  ? 'pendiente'  : 'fallido';

    await dbClient.query(
      'UPDATE pagos SET estado=$1, referencia=$2 WHERE pedido_id=$3',
      [estadoPago, String(payment_id), pedido_id]
    );

    if (estadoMp !== 'approved') {
      await dbClient.query('COMMIT');
      return res.json({ status: estadoMp, pedido_id });
    }

    // Idempotencia: si ya existe comprobante, devolver el existente
    const { rows: existing } = await dbClient.query(
      'SELECT contenido_json FROM comprobantes WHERE pedido_id=$1', [pedido_id]
    );
    if (existing.length) {
      await dbClient.query('COMMIT');
      return res.json({ status: 'approved', pedido_id, comprobante: existing[0].contenido_json });
    }

    // Primera aprobación: actualizar pedido y crear comprobante
    await dbClient.query(
      "UPDATE pedidos SET estado='en_preparacion', updated_at=NOW() WHERE id=$1",
      [pedido_id]
    );

    const { rows: detalles } = await dbClient.query(
      `SELECT dp.cantidad, dp.precio_unitario, dp.subtotal, pr.nombre
       FROM detalle_pedido dp JOIN productos pr ON dp.producto_id=pr.id
       WHERE dp.pedido_id=$1`,
      [pedido_id]
    );
    const { rows: [usuario] } = await dbClient.query(
      'SELECT nombre, email FROM usuarios WHERE id=$1', [req.user.id]
    );
    const { rows: [rest] } = await dbClient.query(
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
      metodo_pago: 'mercadopago',
      referencia: String(payment_id)
    };

    await dbClient.query(
      'INSERT INTO comprobantes (pedido_id, folio, contenido_json) VALUES ($1, $2, $3)',
      [pedido_id, folio, JSON.stringify(contenido)]
    );

    await dbClient.query('COMMIT');
    res.json({ status: 'approved', pedido_id, comprobante: contenido });

  } catch (err) {
    await dbClient.query('ROLLBACK');
    const esErrorPropio = err.message.includes('pedido') || err.message.includes('pago') || err.message.includes('información');
    res.status(500).json({ error: esErrorPropio ? err.message : 'No pudimos verificar el estado de tu pago. Revisa tus pedidos o contacta a soporte.' });
  } finally {
    dbClient.release();
  }
}

/**
 * POST /api/mp/webhook
 * Notificaciones IPN de Mercado Pago (para entorno con URL pública).
 * Responde 200 de inmediato para evitar reintentos de MP.
 */
async function webhook(req, res) {
  res.sendStatus(200);

  try {
    const { type, data } = req.body;
    if (type !== 'payment' || !data?.id) return;

    const payment = new Payment(mpClient);
    const mpPayment = await payment.get({ id: data.id });
    if (!mpPayment.external_reference) return;

    const pedido_id  = parseInt(mpPayment.external_reference, 10);
    const estadoMp   = mpPayment.status;
    const estadoPago =
      estadoMp === 'approved' ? 'completado' :
      estadoMp === 'pending'  ? 'pendiente'  : 'fallido';

    const dbClient = await db.connect();
    try {
      await dbClient.query('BEGIN');

      await dbClient.query(
        'UPDATE pagos SET estado=$1, referencia=$2 WHERE pedido_id=$3',
        [estadoPago, String(data.id), pedido_id]
      );

      if (estadoMp === 'approved') {
        const { rows: existing } = await dbClient.query(
          'SELECT id FROM comprobantes WHERE pedido_id=$1', [pedido_id]
        );
        if (!existing.length) {
          const { rows: pedidos } = await dbClient.query(
            'SELECT * FROM pedidos WHERE id=$1', [pedido_id]
          );
          if (pedidos.length) {
            const pedido = pedidos[0];
            await dbClient.query(
              "UPDATE pedidos SET estado='en_preparacion', updated_at=NOW() WHERE id=$1",
              [pedido_id]
            );
            const { rows: detalles } = await dbClient.query(
              `SELECT dp.cantidad, dp.precio_unitario, dp.subtotal, pr.nombre
               FROM detalle_pedido dp JOIN productos pr ON dp.producto_id=pr.id
               WHERE dp.pedido_id=$1`, [pedido_id]
            );
            const { rows: [usuario] } = await dbClient.query(
              'SELECT nombre, email FROM usuarios WHERE id=$1', [pedido.usuario_id]
            );
            const { rows: [rest] } = await dbClient.query(
              'SELECT nombre FROM restaurantes WHERE id=$1', [pedido.restaurante_id]
            );
            const folio = generarFolio();
            const contenido = {
              folio, fecha: new Date().toISOString(),
              usuario, restaurante: rest.nombre,
              items: detalles, total: pedido.total,
              metodo_pago: 'mercadopago', referencia: String(data.id)
            };
            await dbClient.query(
              'INSERT INTO comprobantes (pedido_id, folio, contenido_json) VALUES ($1, $2, $3)',
              [pedido_id, folio, JSON.stringify(contenido)]
            );
          }
        }
      }

      await dbClient.query('COMMIT');
    } finally {
      dbClient.release();
    }
  } catch (err) {
    console.error('[MP Webhook]', err.message);
  }
}

module.exports = { crearPreferencia, verificarPago, webhook };
