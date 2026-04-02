-- ============================================================
-- TSJ FOODIES - Esquema PostgreSQL
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- USUARIOS
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL DEFAULT 'cliente' CHECK (rol IN ('cliente','restaurante','admin')),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RESTAURANTES
CREATE TABLE IF NOT EXISTS restaurantes (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    imagen_url VARCHAR(255),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    aprobado BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CATEGORIAS
CREATE TABLE IF NOT EXISTS categorias (
    id SERIAL PRIMARY KEY,
    restaurante_id INT NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
    nombre VARCHAR(80) NOT NULL
);

-- PRODUCTOS
CREATE TABLE IF NOT EXISTS productos (
    id SERIAL PRIMARY KEY,
    restaurante_id INT NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
    categoria_id INT REFERENCES categorias(id) ON DELETE SET NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio NUMERIC(10,2) NOT NULL,
    imagen_url VARCHAR(255),
    tiempo_estimado INT NOT NULL DEFAULT 15,
    disponible BOOLEAN NOT NULL DEFAULT TRUE,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PEDIDOS
CREATE TABLE IF NOT EXISTS pedidos (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id),
    restaurante_id INT NOT NULL REFERENCES restaurantes(id),
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
        CHECK (estado IN ('pendiente','en_preparacion','listo','entregado','cancelado')),
    prioridad INT NOT NULL DEFAULT 5,
    total NUMERIC(10,2) NOT NULL,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DETALLE PEDIDO
CREATE TABLE IF NOT EXISTS detalle_pedido (
    id SERIAL PRIMARY KEY,
    pedido_id INT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id INT NOT NULL REFERENCES productos(id),
    cantidad INT NOT NULL,
    precio_unitario NUMERIC(10,2) NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL
);

-- PAGOS
CREATE TABLE IF NOT EXISTS pagos (
    id SERIAL PRIMARY KEY,
    pedido_id INT NOT NULL UNIQUE REFERENCES pedidos(id),
    metodo VARCHAR(20) NOT NULL CHECK (metodo IN ('tarjeta','paypal','efectivo')),
    monto NUMERIC(10,2) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
        CHECK (estado IN ('pendiente','completado','fallido','reembolsado')),
    referencia VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- COMPROBANTES
CREATE TABLE IF NOT EXISTS comprobantes (
    id SERIAL PRIMARY KEY,
    pedido_id INT NOT NULL UNIQUE REFERENCES pedidos(id),
    folio VARCHAR(20) NOT NULL UNIQUE,
    contenido_json JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_pedidos_usuario ON pedidos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_restaurante ON pedidos(restaurante_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos(estado);
CREATE INDEX IF NOT EXISTS idx_productos_restaurante ON productos(restaurante_id);


-- Los datos de prueba se insertan desde backend/src/scripts/seed.js
