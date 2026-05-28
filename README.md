# TSJ Foodies

Plataforma de pedidos de comida en línea para el Tecnológico Superior de Jalisco.

- **Problema que resuelve:** La dificultad de encontrar de manera rápida y ordenada información sobre opciones de alimentos en un entorno digital, agilizando y evitando el problema de hacer fila esperando tu pedido.
- **Dirigido a:** Estudiantes, establecimiento y todo personal del la institusicion.
- **Contexto:** Proyecto académico desarrollado en el marco del **6.º semestre** de la carrera de Ingeniería en Sistemas Computacionales / Desarrollando una pagina web para cubrir los requisitos solcitados en las asignaturas de:
 
 
- **Programación Web:** Frontend HTML/CSS/JS + Backend Node/Express
- **Ingeniería de Software:** Casos de uso, roles, arquitectura MVC
- **Base de Datos:** PostgreSQL normalizado en 3FN, transacciones, índices




## Objetivos

**Objetivo General:**
Desarrollar una plataforma web funcional y atractiva que permita a los usuarios consultar, explorar y gestionar información gastronómica de manera eficiente.


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
│   ├── src/
│   │   ├── config/                 → Configuración PostgreSQL y JWT
│   │   ├── controllers/            → Lógica de negocio
│   │   ├── routes/                 → Rutas API REST
│   │   ├── middlewares/            → Middleware de autenticación y validaciones
│   │   ├── services/               → Servicios auxiliares
│   │   └── app.js                  → Punto de entrada Express
│   ├── .env
│   ├── Dockerfile
│   └── package.json
│
├── db/
│   └── init.sql                    → Esquema PostgreSQL y datos iniciales
│
├── frontend/
│   ├── landing/                    → Landing page pública
│   │
│   ├── src/
│   │   ├── pages/
│   │   │
│   │   │   ├── admin/
│   │   │   │   └── dashboard.html
│   │   │   │
│   │   │   ├── alumno/
│   │   │   │   ├── inicio.html
│   │   │   │   ├── pedidos.html
│   │   │   │   └── pago-resultado.html
│   │   │   │
│   │   │   └── restaurante/
│   │   │       ├── dashboard.html
│   │   │       ├── menu.html
│   │   │       ├── pedidos.html
│   │   │       ├── pagos.html
│   │   │       └── ventas.html
│   │   │
│   │   ├── services/
│   │   │   └── api.js              → Cliente centralizado para API
│   │   │
│   │   └── styles/
│   │       └── main.css            → Estilos globales
│   │
│   ├── login.html
│   ├── nginx.conf.template
│   ├── Dockerfile
│   └── .dockerignore
│
├── .env
├── .env.example
├── .gitignore
├── docker-compose.yml
└── README.md
```

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


## Landing Page

La landing page del proyecto está en `frontend/landing/`.

```
frontend/landing/
├── index.html ← Landing page principal
├── css/styles.css ← Estilos responsive dark theme
├── js/script.js ← FAQ, scroll reveal, menú móvil
└── img/ ← Carpeta para og-image.png
```


## Tecnologías Utilizadas

| Categoría              | Tecnología / Herramienta             |
|------------------------|--------------------------------------|
| **Lenguajes**          | HTML5, CSS3, JavaScript              |
| **Frameworks / Librerías** | [Api de gemini , Api mercado Pago] |
| **Base de Datos**      | [PosgreSQL.] |
| **Contenerización**    | Docker                               |
| **Control de Versiones** | Git, GitHub                        |
| **Editor de Código**   | Visual Studio Code                   |
| **Diseño / Prototipado** | [COMPLETAR: ej. Figma, ninguno]    |






##  Metodología de Trabajo

- **Metodología:** [desarrollo por módulos]
- **Organización del equipo:** El proyecto fue dividido en módulos funcionales asignados a cada integrante según sus habilidades (frontend, lógica, estilos, documentación).
- **Control de versiones:** Se utilizó **Git** con flujo de trabajo basado en ramas (`main` para producción, ramas individuales por módulo o integrante).
- **Plataforma de colaboración:** GitHub — repositorio centralizado con commits regulares para el seguimiento del avance.

---

##  Colaboradores

| Nombre | Rol | GitHub |
|--------|-----|--------|
| Alberto Daniel Martinez Romero | Full Stack | [za230111456@zapopan.tecmm.edu.mx](https://github.com/Daniel220503) |
| Antonio Gael Hernandez Razura |  Full Stack| [za230110346@zapopan.tecmm.edu.mx](https://github.com/Antoninox216) |
| Ruben Salvador Mercado Lucio |   Full Stack | [za230110877@zapopan.tecmm.edu.mx](https://github.com/TamlitoVerdeMain)|


> **Carrera:** Ingeniería en Sistemas Computacionales sexto semestre 
> **Institución:** INSTITUTO TECNOLÓGICO JOSÉ MARIO MOLINA PASQUEL Y HENRÍQUEZ / TECMM

---

##  Estado del Proyecto



 **Prototipo funcional**


 ## link para probar el prototipo del proyecto :

 https://tsjfoodies.up.railway.app/landing/



 



---

## Licencia

Este proyecto se distribuye bajo una licencia de **uso educativo y académico**.
Cualquier uso fuera del contexto académico debe contar con la autorización de los autores.


Uso Educativo – Proyecto Académico
© 2026 Foodies TSJ – Todos los derechos reservados
