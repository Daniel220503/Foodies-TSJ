const express = require('express');
const cors    = require('cors');
require('dotenv').config();

// Validar variables de entorno críticas antes de arrancar
const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`❌ Variables de entorno faltantes: ${missing.join(', ')}`);
  process.exit(1);
}

const app = express();

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',').map(o => o.trim().replace(/\/$/, ''));
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// Rutas
app.use('/api/auth',         require('./routes/auth.routes'));
app.use('/api/restaurantes', require('./routes/restaurantes.routes'));
app.use('/api/productos',    require('./routes/productos.routes'));
app.use('/api/categorias',   require('./routes/categorias.routes'));
app.use('/api/pedidos',      require('./routes/pedidos.routes'));
app.use('/api/pagos',        require('./routes/pagos.routes'));
app.use('/api/comprobantes', require('./routes/comprobantes.routes'));
app.use('/api/admin',        require('./routes/admin.routes'));
app.use('/api/mp',           require('./routes/mp.routes'));
app.use('/api/chat',         require('./routes/chat.routes'));

app.get('/api/health', (_, res) => res.json({ status: 'OK', app: 'TSJ Foodies API' }));

// Error handler global
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Error interno' });
});

async function inactivarAlumnosInactivos() {
  try {
    const db = require('./config/db');
    const { rowCount } = await db.query(`
      UPDATE usuarios
      SET activo = FALSE, updated_at = NOW()
      WHERE rol = 'cliente'
        AND activo = TRUE
        AND COALESCE(last_login, created_at) < NOW() - INTERVAL '30 days'
    `);
    if (rowCount > 0)
      console.log(`⏰ Inactividad: ${rowCount} alumno(s) sin actividad por +30 días marcados como inactivos`);
  } catch (e) {
    console.error('Error en job de inactividad:', e.message);
  }
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`✅ TSJ Foodies API en puerto ${PORT}`);
  const seed = require('./scripts/seed');
  await seed();

  // Job diario: inactivar alumnos sin actividad por 30 días
  await inactivarAlumnosInactivos();
  setInterval(inactivarAlumnosInactivos, 24 * 60 * 60 * 1000);
});
