/* =============================================
 TSJ FOODIES — Módulo API
 Consumo centralizado de la API REST
 ============================================= */

// Con Docker: nginx hace proxy de /api/ al backend
// Para desarrollo local sin Docker: cambia a 'http://localhost:5000/api'
const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
 ? 'http://localhost:5000/api' // desarrollo local directo
 : '/api'; // producción con nginx proxy

// ── Token helpers ──────────────────────────────
function getToken() { return localStorage.getItem('tsj_token'); }
function getUser() { return JSON.parse(localStorage.getItem('tsj_user') || 'null'); }
function setSession(t, u) { localStorage.setItem('tsj_token', t); localStorage.setItem('tsj_user', JSON.stringify(u)); }
function clearSession() { localStorage.removeItem('tsj_token'); localStorage.removeItem('tsj_user'); }

function authHeader() {
 const t = getToken();
 return t ? { 'Authorization': `Bearer ${t}` } : {};
}

// ── Fetch wrapper ──────────────────────────────
async function api(method, path, body = null) {
 const opts = {
 method,
 headers: { 'Content-Type': 'application/json', ...authHeader() }
 };
 if (body) opts.body = JSON.stringify(body);
 const res = await fetch(API_URL + path, opts);
 const data = await res.json().catch(() => ({}));
 if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
 return data;
}

// ── Auth ───────────────────────────────────────
const Auth = {
 register: (d) => api('POST', '/auth/register', d),
 login: (d) => api('POST', '/auth/login', d),
 me: () => api('GET', '/auth/me'),
 logout: () => { clearSession(); window.location.href = '/login.html'; }
};

// ── Restaurantes ───────────────────────────────
const Restaurantes = {
 getAll: () => api('GET', '/restaurantes'),
 getById: (id) => api('GET', `/restaurantes/${id}`),
 getMenu: (id) => api('GET', `/restaurantes/${id}/menu`),
 create: (d) => api('POST', '/restaurantes', d),
 update: (id,d)=> api('PUT', `/restaurantes/${id}`, d)
};

// ── Productos ──────────────────────────────────
const Productos = {
 create: (d) => api('POST', '/productos', d),
 update: (id, d) => api('PUT', `/productos/${id}`, d),
 remove: (id) => api('DELETE', `/productos/${id}`)
};

// ── Categorias ─────────────────────────────────
const Categorias = {
 create: (d) => api('POST', '/categorias', d),
 remove: (id) => api('DELETE', `/categorias/${id}`)
};

// ── Pedidos ────────────────────────────────────
const Pedidos = {
 create: (d) => api('POST', '/pedidos', d),
 misPedidos: () => api('GET', '/pedidos/mis-pedidos'),
 delRestaurante: () => api('GET', '/pedidos/restaurante'),
 updateEstado: (id, estado)=> api('PATCH', `/pedidos/${id}/estado`, { estado })
};

// ── Pagos ──────────────────────────────────────
const Pagos = {
 procesar: (d) => api('POST', '/pagos', d)
};

// ── Mercado Pago ────────────────────────────────
const MP = {
  crearPreferencia: (d) => api('POST', '/mp/preferencia', d),
  verificar:        (d) => api('POST', '/mp/verificar', d)
};

// ── Comprobantes ───────────────────────────────
const Comprobantes = {
 get: (pedidoId) => api('GET', `/comprobantes/${pedidoId}`)
};

// ── Admin ──────────────────────────────────────
const Admin = {
 stats: () => api('GET', '/admin/stats'),
 // Usuarios
 usuarios: () => api('GET', '/admin/usuarios'),
 usuariosRestaurante: () => api('GET', '/admin/usuarios/restaurantes'),
 toggleUsuario: (id) => api('PATCH', `/admin/usuarios/${id}/toggle`),
 // Restaurantes CRUD
 restaurantes: () => api('GET', '/admin/restaurantes'),
 crearRestaurante: (d) => api('POST', '/admin/restaurantes', d),
 actualizarRestaurante: (id, d) => api('PUT', `/admin/restaurantes/${id}`, d),
 eliminarRestaurante: (id) => api('DELETE', `/admin/restaurantes/${id}`),
 aprobarRestaurante: (id) => api('PATCH', `/admin/restaurantes/${id}/aprobar`),
 toggleRestaurante: (id) => api('PATCH', `/admin/restaurantes/${id}/toggle`),
 // Productos CRUD (admin sobre cualquier restaurante)
 productos: (rid) => api('GET', `/admin/restaurantes/${rid}/productos`),
 crearProducto: (rid, d) => api('POST', `/admin/restaurantes/${rid}/productos`, d),
 actualizarProducto: (rid, pid, d) => api('PUT', `/admin/restaurantes/${rid}/productos/${pid}`, d),
 eliminarProducto: (rid, pid) => api('DELETE', `/admin/restaurantes/${rid}/productos/${pid}`),
 // Pedidos
 pedidos: () => api('GET', '/admin/pedidos')
};

// ── Carrito (localStorage) ─────────────────────
const Carrito = {
 get() { return JSON.parse(localStorage.getItem('tsj_cart') || '[]'); },
 save(items) { localStorage.setItem('tsj_cart', JSON.stringify(items)); },
 add(producto, restaurante_id) {
 let items = this.get();
 // Si hay items de otro restaurante, limpiamos
 if (items.length > 0 && items[0].restaurante_id !== restaurante_id) {
 if (!confirm('Tu carrito tiene productos de otro restaurante. ¿Vaciarlo y agregar este?')) return false;
 items = [];
 }
 const existe = items.find(i => i.producto_id === producto.id);
 if (existe) { existe.cantidad++; }
 else { items.push({ producto_id: producto.id, nombre: producto.nombre, precio: producto.precio, cantidad: 1, restaurante_id }); }
 this.save(items);
 return true;
 },
 remove(producto_id) {
 this.save(this.get().filter(i => i.producto_id !== producto_id));
 },
 updateCantidad(producto_id, cantidad) {
 const items = this.get().map(i => i.producto_id === producto_id ? {...i, cantidad} : i);
 this.save(items.filter(i => i.cantidad > 0));
 },
 total() { return this.get().reduce((s, i) => s + i.precio * i.cantidad, 0); },
 count() { return this.get().reduce((s, i) => s + i.cantidad, 0); },
 clear() { localStorage.removeItem('tsj_cart'); }
};

// ── Guard helpers ──────────────────────────────
function requireAuth(rol = null) {
 const user = getUser();
 if (!user || !getToken()) { window.location.href = '/login.html'; return null; }
 if (rol && user.rol !== rol) {
 alert('Acceso denegado');
 window.location.href = '/login.html';
 return null;
 }
 return user;
}

// ── Toast ──────────────────────────────────────
function toast(msg, type = 'default') {
 let container = document.getElementById('toast-container');
 if (!container) {
 container = document.createElement('div');
 container.id = 'toast-container';
 container.className = 'toast-container';
 document.body.appendChild(container);
 }
 const icons = { success: '', error: '', warning: '', default: '' };
 const el = document.createElement('div');
 el.className = `toast ${type}`;
 el.innerHTML = `<span>${icons[type]||icons.default}</span><span>${msg}</span>`;
 container.appendChild(el);
 setTimeout(() => el.remove(), 3500);
}
