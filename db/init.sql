CREATE TYPE rol_usuario AS ENUM (
    'cliente',
    'restaurante',
    'administrador'
);

CREATE TABLE restaurantes (
    id_restaurante SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    ubicacion VARCHAR(255),
    telefono VARCHAR(20),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE usuarios (
    id_usuario SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    telefono VARCHAR(20),
    matricula VARCHAR(30) UNIQUE,

    rol rol_usuario NOT NULL,

    id_restaurante INT,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_usuario_restaurante
        FOREIGN KEY (id_restaurante)
        REFERENCES restaurantes(id_restaurante)
        ON DELETE SET NULL,

    CONSTRAINT chk_usuario_restaurante
        CHECK (
            (rol = 'restaurante' AND id_restaurante IS NOT NULL)
            OR
            (rol IN ('cliente', 'administrador'))
        )
);

CREATE TABLE categorias (
    id_categoria SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    icono VARCHAR(255),
    activa BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE horarios_restaurante (
    id_horario SERIAL PRIMARY KEY,
    id_restaurante INT NOT NULL,
    dia_semana INT NOT NULL,
    hora_apertura TIME NOT NULL,
    hora_cierre TIME NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_horario_restaurante
        FOREIGN KEY (id_restaurante)
        REFERENCES restaurantes(id_restaurante)
        ON DELETE CASCADE,

    CONSTRAINT chk_dia_semana
        CHECK (dia_semana BETWEEN 1 AND 7),

    CONSTRAINT chk_horas
        CHECK (hora_cierre > hora_apertura)
);

CREATE TABLE menu_items (
    id_item SERIAL PRIMARY KEY,
    id_restaurante INT NOT NULL,
    id_categoria INT NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    precio NUMERIC(10,2) NOT NULL,
    imagen_url VARCHAR(255),
    disponible BOOLEAN NOT NULL DEFAULT TRUE,
    tiempo_prep_min INT,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_menu_restaurante
        FOREIGN KEY (id_restaurante)
        REFERENCES restaurantes(id_restaurante)
        ON DELETE CASCADE,

    CONSTRAINT fk_menu_categoria
        FOREIGN KEY (id_categoria)
        REFERENCES categorias(id_categoria)
        ON DELETE RESTRICT,

    CONSTRAINT chk_precio
        CHECK (precio >= 0),

    CONSTRAINT chk_tiempo_prep
        CHECK (tiempo_prep_min IS NULL OR tiempo_prep_min >= 0)
);

CREATE TABLE pedidos ( 
    id_pedido SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_restaurante INT NOT NULL,
    codigo_retiro VARCHAR(50),
    estado VARCHAR(30) NOT NULL,
    total NUMERIC(10,2) NOT NULL DEFAULT 0,
    notas TEXT,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    listo_en TIMESTAMP,

    CONSTRAINT fk_pedido_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT fk_pedido_restaurante
        FOREIGN KEY (id_restaurante)
        REFERENCES restaurantes(id_restaurante)
        ON DELETE RESTRICT,

    CONSTRAINT chk_total
        CHECK (total >= 0)
);

CREATE TABLE detalle_pedido (
    id_detalle SERIAL PRIMARY KEY,
    id_pedido INT NOT NULL,
    id_item INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario NUMERIC(10,2) NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL,
    notas_item TEXT,

    CONSTRAINT fk_detalle_pedido
        FOREIGN KEY (id_pedido)
        REFERENCES pedidos(id_pedido)
        ON DELETE CASCADE,

    CONSTRAINT fk_detalle_item
        FOREIGN KEY (id_item)
        REFERENCES menu_items(id_item)
        ON DELETE RESTRICT,

    CONSTRAINT chk_cantidad
        CHECK (cantidad > 0),

    CONSTRAINT chk_precio_unitario
        CHECK (precio_unitario >= 0),

    CONSTRAINT chk_subtotal
        CHECK (subtotal >= 0)
);