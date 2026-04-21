const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const app = express();

app.use(cors({ origin: '*' }));
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

app.get('/api/health', (_, res) => res.json({ status: 'OK', app: 'TSJ Foodies API' }));

// Error handler global
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Error interno' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`✅ TSJ Foodies API en puerto ${PORT}`);
  // Crear usuarios/datos de prueba con hashes bcrypt reales
  const seed = require('./scripts/seed');
  await seed();
});
