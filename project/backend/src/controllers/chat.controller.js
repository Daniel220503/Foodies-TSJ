const db = require('../config/db');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Consulta la BD y arma un texto con todos los restaurantes y sus productos
async function buildMenuContext() {
  const { rows } = await db.query(`
    SELECT
      r.nombre       AS restaurante,
      r.descripcion  AS restaurante_desc,
      c.nombre       AS categoria,
      p.nombre       AS producto,
      p.descripcion  AS producto_desc,
      p.precio,
      p.tiempo_estimado,
      p.disponible
    FROM restaurantes r
    LEFT JOIN productos p ON p.restaurante_id = r.id
    LEFT JOIN categorias c ON c.id = p.categoria_id
    WHERE r.aprobado = TRUE AND r.activo = TRUE
    ORDER BY r.nombre, c.nombre, p.precio
  `);

  // Agrupamos los productos por restaurante
  const restaurantes = {};
  for (const row of rows) {
    if (!restaurantes[row.restaurante]) {
      restaurantes[row.restaurante] = { desc: row.restaurante_desc, productos: [] };
    }
    if (row.producto) {
      restaurantes[row.restaurante].productos.push(row);
    }
  }

  // Construimos el texto que leerá Gemini
  let contexto = 'RESTAURANTES Y MENÚS DISPONIBLES EN TSJ FOODIES:\n\n';
  for (const [nombre, data] of Object.entries(restaurantes)) {
    contexto += `Restaurante: ${nombre}\n`;
    contexto += `Descripción: ${data.desc}\n`;
    const disponibles = data.productos.filter(p => p.disponible !== false);
    if (disponibles.length) {
      contexto += `Productos:\n`;
      for (const p of disponibles) {
        contexto += `  - ${p.producto} [${p.categoria}]: $${parseFloat(p.precio).toFixed(2)} MXN`;
        contexto += `, tiempo estimado: ${p.tiempo_estimado} min`;
        if (p.producto_desc) contexto += `, descripción: ${p.producto_desc}`;
        contexto += '\n';
      }
    }
    contexto += '\n';
  }
  return contexto;
}

// Reúne todo el contexto del restaurante desde la BD para dárselo a Gemini
async function buildRestauranteContext(restaurante_id) {
  // 1. Info básica y menú del restaurante
  const { rows: menu } = await db.query(`
    SELECT r.nombre AS restaurante, r.descripcion,
           c.nombre AS categoria, p.nombre AS producto,
           p.descripcion AS producto_desc, p.precio, p.disponible
    FROM restaurantes r
    LEFT JOIN productos p ON p.restaurante_id = r.id AND p.deleted_at IS NULL
    LEFT JOIN categorias c ON c.id = p.categoria_id
    WHERE r.id = $1
    ORDER BY c.nombre, p.precio
  `, [restaurante_id]);

  // 2. Platillos más vendidos (top 10 histórico)
  const { rows: masVendidos } = await db.query(`
    SELECT pr.nombre, SUM(dp.cantidad)::int AS veces_pedido,
           SUM(dp.subtotal)::numeric AS ingresos_generados
    FROM detalle_pedido dp
    JOIN productos pr ON dp.producto_id = pr.id
    JOIN pedidos p ON dp.pedido_id = p.id
    WHERE p.restaurante_id = $1 AND p.estado != 'cancelado'
    GROUP BY pr.nombre
    ORDER BY veces_pedido DESC
    LIMIT 10
  `, [restaurante_id]);

  // 3. Resumen de pedidos por estado
  const { rows: estadosPedidos } = await db.query(`
    SELECT estado, COUNT(*)::int AS cantidad, SUM(total)::numeric AS monto_total
    FROM pedidos
    WHERE restaurante_id = $1
    GROUP BY estado
  `, [restaurante_id]);

  // 4. Ingresos por método de pago
  const { rows: metodosPago } = await db.query(`
    SELECT pa.metodo, COUNT(*)::int AS cantidad, SUM(pa.monto)::numeric AS total
    FROM pagos pa
    JOIN pedidos p ON pa.pedido_id = p.id
    WHERE p.restaurante_id = $1 AND pa.estado = 'completado'
    GROUP BY pa.metodo
  `, [restaurante_id]);

  // 5. Ventas de los últimos 7 días
  const { rows: ventasSemana } = await db.query(`
    SELECT DATE(created_at) AS fecha, COUNT(*)::int AS pedidos,
           SUM(total)::numeric AS ingresos
    FROM pedidos
    WHERE restaurante_id = $1 AND estado != 'cancelado'
      AND created_at >= NOW() - INTERVAL '7 days'
    GROUP BY DATE(created_at)
    ORDER BY fecha DESC
  `, [restaurante_id]);

  // Armamos el texto de contexto
  const info = menu[0] || {};
  let ctx = `RESTAURANTE: ${info.restaurante}\n`;
  ctx += `Descripción: ${info.descripcion || 'Sin descripción'}\n\n`;

  ctx += `MENÚ ACTUAL:\n`;
  const disponibles = menu.filter(r => r.producto && r.disponible !== false);
  const noDisponibles = menu.filter(r => r.producto && r.disponible === false);
  if (disponibles.length) {
    disponibles.forEach(r => {
      ctx += `  - ${r.producto} [${r.categoria}]: $${parseFloat(r.precio).toFixed(2)} MXN`;
      if (r.producto_desc) ctx += ` — ${r.producto_desc}`;
      ctx += '\n';
    });
  }
  if (noDisponibles.length) {
    ctx += `Productos pausados: ${noDisponibles.map(r => r.producto).join(', ')}\n`;
  }

  ctx += `\nPLATILLOS MÁS VENDIDOS:\n`;
  if (masVendidos.length) {
    masVendidos.forEach((p, i) => {
      ctx += `  ${i + 1}. ${p.nombre}: ${p.veces_pedido} veces pedido, $${parseFloat(p.ingresos_generados).toFixed(2)} MXN generados\n`;
    });
  } else {
    ctx += `  Sin ventas registradas aún.\n`;
  }

  ctx += `\nRESUMEN DE PEDIDOS:\n`;
  estadosPedidos.forEach(e => {
    ctx += `  - ${e.estado}: ${e.cantidad} pedidos ($${parseFloat(e.monto_total || 0).toFixed(2)} MXN)\n`;
  });

  ctx += `\nINGRESOS POR MÉTODO DE PAGO:\n`;
  if (metodosPago.length) {
    metodosPago.forEach(m => {
      ctx += `  - ${m.metodo}: ${m.cantidad} pagos, $${parseFloat(m.total).toFixed(2)} MXN\n`;
    });
  } else {
    ctx += `  Sin pagos completados aún.\n`;
  }

  ctx += `\nVENTAS ÚLTIMOS 7 DÍAS:\n`;
  if (ventasSemana.length) {
    ventasSemana.forEach(v => {
      ctx += `  - ${v.fecha}: ${v.pedidos} pedidos, $${parseFloat(v.ingresos).toFixed(2)} MXN\n`;
    });
  } else {
    ctx += `  Sin ventas en los últimos 7 días.\n`;
  }

  return ctx;
}

exports.chatRestaurante = async (req, res) => {
  try {
    const { mensaje, historial = [] } = req.body;
    if (!mensaje || !mensaje.trim()) {
      return res.status(400).json({ error: 'Mensaje requerido' });
    }

    const restaurante_id = req.user.restaurante_id;
    if (!restaurante_id) {
      return res.status(400).json({ error: 'No tienes un restaurante asociado' });
    }

    const contexto = await buildRestauranteContext(restaurante_id);

    const systemInstruction = `Eres un asistente de administración para restaurantes de TSJ Foodies, una plataforma de pedidos del Tecnológico de Zapopan (TSJ) en México.

Estás hablando directamente con el dueño o encargado del restaurante. Tienes acceso a todos sus datos reales de ventas, menú y pedidos.

DATOS ACTUALES DEL RESTAURANTE:
${contexto}

Tus capacidades:
- Analizar qué platillos se venden más y cuáles están estancados
- Dar recomendaciones concretas para mejorar ventas (precios, promociones, platillos a retirar)
- Explicar tendencias de ventas por día
- Ayudar a entender qué método de pago prefieren sus clientes
- Sugerir estrategias de administración basadas en los datos reales

Reglas:
- Responde siempre en español, de forma profesional pero amigable.
- Usa los datos reales para dar respuestas concretas con números y nombres.
- Si no hay suficientes datos (restaurante nuevo), indícalo y da consejos generales.
- Sé directo y práctico. Máximo 5 líneas salvo que pidan un análisis completo.`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction,
    });

    const chat = model.startChat({ history: historial });
    const result = await chat.sendMessage(mensaje);
    const respuesta = result.response.text();

    res.json({ respuesta });
  } catch (err) {
    console.error('Error Gemini Restaurante:', err.message);
    res.status(500).json({ error: 'No pude procesar tu pregunta. Intenta de nuevo.' });
  }
};

exports.chat = async (req, res) => {
  try {
    const { mensaje, historial = [] } = req.body;
    if (!mensaje || !mensaje.trim()) {
      return res.status(400).json({ error: 'Mensaje requerido' });
    }

    // Obtenemos el menú actualizado de la BD en cada llamada
    const menuContexto = await buildMenuContext();

    // El "system instruction" es el rol que le asignamos a Gemini:
    // le decimos quién es y le damos todo el menú como información
    const systemInstruction = `Eres el asistente virtual de TSJ Foodies, una plataforma de pedidos de comida del Tecnológico de Zapopan (TSJ) en México.

Tu trabajo es ayudar a los alumnos a conocer los restaurantes, platillos, precios, tiempos de preparación y dar recomendaciones.

Aquí está la información actualizada de los restaurantes y su menú:
${menuContexto}

Reglas:
- Responde siempre en español, de forma amigable, clara y directa.
- Usa los datos del menú para responder. Si preguntan el más barato, el más rápido, o piden recomendaciones, analiza los datos y da una respuesta concreta con nombre y precio.
- No inventes platillos, precios ni datos que no estén en el menú.
- Si algo no está disponible o no está en el menú, dilo con amabilidad.
- Respuestas cortas y al punto: máximo 4 líneas salvo que el usuario pida una lista completa.`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction,
    });

    // "historial" es el historial de la conversación que manda el frontend
    // Gemini lo usa para recordar lo que se dijo antes en el mismo chat
    const chat = model.startChat({ history: historial });

    const result = await chat.sendMessage(mensaje);
    const respuesta = result.response.text();

    res.json({ respuesta });
  } catch (err) {
    console.error('Error Gemini:', err.message);
    res.status(500).json({ error: 'No pude procesar tu pregunta. Intenta de nuevo.' });
  }
};
