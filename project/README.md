# TSJ Foodies

Plataforma de pedidos de comida en línea para el Tecnológico Superior de Jalisco.




# 2. Levantar todo con Docker
docker-compose up --build

# 3. Abrir en el navegador
# Frontend: http://localhost:8080
# API: http://localhost:5000/api/health
# PostgreSQL: localhost:5433
```

## Usuarios de prueba (contraseña: `Test1234!`)

| Email | Rol |
|---|---|
| admin@zapopan.tecmm.edu.mx | Administrador |
| tacos@zapopan.tecmm.edu.mx | Restaurante |
| tortas@zapopan.tecmm.edu.mx | Restaurante |
| juan@zapopan.tecmm.edu.mx | Cliente |
| maria@zapopan.tecmm.edu.mx | Cliente |

## Estructura del proyecto

```
Foodies-TSJ/
├── backend/
│ ├── src/
│ │ ├── config/ → BD (PostgreSQL) y middleware JWT
│ │ ├── controllers/ → Lógica de negocio por módulo
│ │ └── routes/ → Rutas de la API REST
│ ├── Dockerfile
│ └── package.json
├── frontend/
│ ├── index.html → Login / Registro
│ ├── src/
│ │ ├── pages/
│ │ │ ├── alumno/ → inicio.html, pedidos.html
│ │ │ ├── restaurante/ → dashboard.html, menu.html, pagos.html, ventas.html
│ │ │ └── admin/ → dashboard.html
│ │ ├── services/ → api.js (módulo centralizado)
│ │ └── styles/ → main.css (estilos globales)
│ └── Dockerfile
├── db/
│ └── init.sql → Esquema PostgreSQL + datos de prueba
└── docker-compose.yml
```

## Stack tecnológico

- **Frontend:** HTML5 + CSS3 + JavaScript vanilla
- **Backend:** Node.js + Express.js
- **Base de datos:** PostgreSQL 17
- **Auth:** JWT + bcrypt
- **Contenedores:** Docker + Docker Compose

## API Endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| POST | /api/auth/register | Registro con @zapopan.tecmm.edu.mx |
| POST | /api/auth/login | Login → retorna JWT |
| GET | /api/restaurantes | Listar restaurantes |
| GET | /api/restaurantes/:id/menu | Menú de un restaurante |
| POST | /api/productos | Crear producto (restaurante) |
| PUT | /api/productos/:id | Editar producto (restaurante) |
| DELETE | /api/productos/:id | Eliminar producto |
| POST | /api/pedidos | Crear pedido |
| GET | /api/pedidos/mis-pedidos | Historial del cliente |
| GET | /api/pedidos/restaurante | Pedidos del restaurante |
| PATCH | /api/pedidos/:id/estado | Actualizar estado |
| POST | /api/pagos | Procesar pago |
| GET | /api/comprobantes/:id | Ver comprobante |
| GET | /api/admin/stats | Estadísticas (admin) |

## Materias cubiertas

- **Programación Web:** Frontend HTML/CSS/JS + Backend Node/Express
- **Ingeniería de Software:** Casos de uso, roles, arquitectura MVC
- **Base de Datos:** PostgreSQL normalizado en 3FN, transacciones, índices

---
*Proyecto de 6to semestre — TSJ 2024-2025*

---

## Landing Page

La landing page del proyecto está en `frontend/landing/`.

```
frontend/landing/
├── index.html ← Landing page principal
├── css/styles.css ← Estilos responsive dark theme
├── js/script.js ← FAQ, scroll reveal, menú móvil
└── img/ ← Carpeta para og-image.png
```

**Para verla localmente:**
```bash
# Desde la carpeta frontend/
open landing/index.html
# O con servidor:
npx serve frontend/
# Luego abre: http://localhost:3000/landing/
```

**Botones de la landing:**
- "Crear cuenta gratis" y "Entrar" → apuntan a `../index.html` (login del proyecto)
