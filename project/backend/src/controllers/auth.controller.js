const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const db      = require('../config/db');
const SECRET  = process.env.JWT_SECRET || 'tsj_foodies_secret_2024';

// Dominio institucional válido
const DOMINIO = '@zapopan.tecmm.edu.mx';

async function register(req, res) {
  const { nombre, email, password, rol } = req.body;

  if (!nombre || !email || !password)
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });

  if (!email.toLowerCase().endsWith(DOMINIO))
    return res.status(400).json({ error: `Usa tu correo institucional ${DOMINIO}` });

  if (password.length < 6)
    return res.status(400).json({ error: 'La contraseña debe tener mínimo 6 caracteres' });

  // Solo se permiten estos dos roles en el registro público
  const rolFinal = rol === 'restaurante' ? 'restaurante' : 'cliente';

  try {
    const existe = await db.query('SELECT id FROM usuarios WHERE email=$1', [email.toLowerCase()]);
    if (existe.rows.length > 0)
      return res.status(409).json({ error: 'Este correo ya está registrado' });

    const hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES ($1,$2,$3,$4) RETURNING id',
      [nombre.trim(), email.toLowerCase(), hash, rolFinal]
    );
    res.status(201).json({ message: 'Cuenta creada exitosamente', id: result.rows[0].id });
  } catch (err) {
    console.error('register:', err);
    res.status(500).json({ error: 'Error al registrar la cuenta' });
  }
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email y contraseña requeridos' });

  try {
    const { rows } = await db.query(
      'SELECT * FROM usuarios WHERE email=$1 AND activo=TRUE', [email.toLowerCase()]
    );
    if (!rows.length)
      return res.status(401).json({ error: 'Credenciales incorrectas' });

    const user = rows[0];
    const ok   = await bcrypt.compare(password, user.password_hash);
    if (!ok)
      return res.status(401).json({ error: 'Credenciales incorrectas' });

    // Si es restaurante, buscar su restaurante_id
    let restaurante_id = null;
    if (user.rol === 'restaurante') {
      const r = await db.query(
        'SELECT id FROM restaurantes WHERE usuario_id=$1 AND activo=TRUE LIMIT 1', [user.id]
      );
      if (r.rows.length) restaurante_id = r.rows[0].id;
    }

    const token = jwt.sign(
      { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol, restaurante_id },
      SECRET,
      { expiresIn: '24h' }
    );
    res.json({
      token,
      usuario: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol, restaurante_id }
    });
  } catch (err) {
    console.error('login:', err);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
}

async function me(req, res) {
  try {
    const { rows } = await db.query(
      'SELECT id,nombre,email,rol,created_at FROM usuarios WHERE id=$1', [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
}

module.exports = { register, login, me };
