CREATE DATABASE IF NOT EXISTS invemoto
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE invemoto;

CREATE TABLE rol (
    id_rol INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(50) NOT NULL,
    descripcion VARCHAR(255) NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
    CONSTRAINT chk_rol_estado CHECK (estado IN ('ACTIVO', 'INACTIVO'))
) ENGINE=InnoDB;

CREATE TABLE empresa (
    id_empresa INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nit VARCHAR(30) NULL,
    nombre VARCHAR(150) NOT NULL,
    direccion VARCHAR(250) NULL,
    telefono VARCHAR(30) NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_empresa_estado CHECK (estado IN ('ACTIVO', 'INACTIVO')),
    CONSTRAINT uq_empresa_nit UNIQUE (nit)
) ENGINE=InnoDB;

CREATE TABLE usuario (
    id_usuario INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT UNSIGNED NOT NULL,
    id_rol INT UNSIGNED NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    correo VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_usuario_estado CHECK (estado IN ('ACTIVO', 'INACTIVO')),
    CONSTRAINT fk_usuario_empresa
        FOREIGN KEY (id_empresa) REFERENCES empresa (id_empresa)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_usuario_rol
        FOREIGN KEY (id_rol) REFERENCES rol (id_rol)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE categoria (
    id_categoria INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT UNSIGNED NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255) NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
    CONSTRAINT chk_categoria_estado CHECK (estado IN ('ACTIVO', 'INACTIVO')),
    CONSTRAINT uq_categoria_empresa_nombre UNIQUE (id_empresa, nombre),
    CONSTRAINT fk_categoria_empresa
        FOREIGN KEY (id_empresa) REFERENCES empresa (id_empresa)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE producto (
    id_producto INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT UNSIGNED NOT NULL,
    id_categoria INT UNSIGNED NOT NULL,
    codigo_producto VARCHAR(50) NOT NULL,
    presentacion VARCHAR(20) NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion VARCHAR(255) NULL,
    precio_venta DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    costo DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
    CONSTRAINT chk_producto_precio CHECK (precio_venta >= 0),
    CONSTRAINT chk_producto_costo CHECK (costo >= 0),
    CONSTRAINT chk_producto_estado CHECK (estado IN ('ACTIVO', 'INACTIVO')),
    CONSTRAINT uq_producto_empresa_codigo UNIQUE (id_empresa, codigo_producto),
    CONSTRAINT fk_producto_empresa
        FOREIGN KEY (id_empresa) REFERENCES empresa (id_empresa)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_producto_categoria
        FOREIGN KEY (id_categoria) REFERENCES categoria (id_categoria)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE inventario (
    id_inventario INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_producto INT UNSIGNED NOT NULL UNIQUE,
    stock_actual INT UNSIGNED NOT NULL DEFAULT 0,
    stock_minimo INT UNSIGNED NULL,
    fecha_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_inventario_producto
        FOREIGN KEY (id_producto) REFERENCES producto (id_producto)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE proveedor (
    id_proveedor INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT UNSIGNED NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    telefono VARCHAR(30) NULL,
    correo VARCHAR(150) NULL,
    direccion VARCHAR(250) NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
    CONSTRAINT chk_proveedor_estado CHECK (estado IN ('ACTIVO', 'INACTIVO')),
    CONSTRAINT fk_proveedor_empresa
        FOREIGN KEY (id_empresa) REFERENCES empresa (id_empresa)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE ingreso_mercancia (
    id_ingreso INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT UNSIGNED NOT NULL,
    id_proveedor INT UNSIGNED NOT NULL,
    id_usuario INT UNSIGNED NOT NULL,
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_ingreso DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    observacion VARCHAR(255) NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'CONFIRMADO',
    CONSTRAINT chk_ingreso_total CHECK (total_ingreso >= 0),
    CONSTRAINT chk_ingreso_estado CHECK (estado IN ('CONFIRMADO', 'ANULADO')),
    CONSTRAINT fk_ingreso_empresa
        FOREIGN KEY (id_empresa) REFERENCES empresa (id_empresa)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_ingreso_proveedor
        FOREIGN KEY (id_proveedor) REFERENCES proveedor (id_proveedor)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_ingreso_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE detalle_ingreso (
    id_detalle_ingreso INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_ingreso INT UNSIGNED NOT NULL,
    id_producto INT UNSIGNED NOT NULL,
    cantidad INT UNSIGNED NOT NULL,
    valor_total_linea DECIMAL(12,2) NOT NULL,
    costo_unitario DECIMAL(12,2) NOT NULL,
    CONSTRAINT chk_detalle_ingreso_cantidad CHECK (cantidad > 0),
    CONSTRAINT chk_detalle_ingreso_valor CHECK (valor_total_linea >= 0),
    CONSTRAINT chk_detalle_ingreso_costo CHECK (costo_unitario >= 0),
    CONSTRAINT fk_detalle_ingreso_ingreso
        FOREIGN KEY (id_ingreso) REFERENCES ingreso_mercancia (id_ingreso)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_detalle_ingreso_producto
        FOREIGN KEY (id_producto) REFERENCES producto (id_producto)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE metodo_pago (
    id_metodo_pago INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(50) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
    CONSTRAINT chk_metodo_pago_estado CHECK (estado IN ('ACTIVO', 'INACTIVO'))
) ENGINE=InnoDB;

CREATE TABLE venta (
    id_venta INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT UNSIGNED NOT NULL,
    id_usuario INT UNSIGNED NOT NULL,
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    descuento DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    id_metodo_pago INT UNSIGNED NOT NULL,
    metodo_pago_otro_detalle VARCHAR(100) NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    CONSTRAINT chk_venta_subtotal CHECK (subtotal >= 0),
    CONSTRAINT chk_venta_descuento CHECK (descuento >= 0),
    CONSTRAINT chk_venta_total CHECK (total >= 0),
    CONSTRAINT chk_venta_estado CHECK (estado IN ('PENDIENTE', 'CONFIRMADA', 'ANULADA')),
    CONSTRAINT fk_venta_empresa
        FOREIGN KEY (id_empresa) REFERENCES empresa (id_empresa)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_venta_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_venta_metodo_pago
        FOREIGN KEY (id_metodo_pago) REFERENCES metodo_pago (id_metodo_pago)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE detalle_venta (
    id_detalle_venta INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_venta INT UNSIGNED NOT NULL,
    id_producto INT UNSIGNED NOT NULL,
    cantidad INT UNSIGNED NOT NULL,
    precio_unitario DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    CONSTRAINT chk_detalle_venta_cantidad CHECK (cantidad > 0),
    CONSTRAINT chk_detalle_venta_precio CHECK (precio_unitario >= 0),
    CONSTRAINT chk_detalle_venta_subtotal CHECK (subtotal >= 0),
    CONSTRAINT fk_detalle_venta_venta
        FOREIGN KEY (id_venta) REFERENCES venta (id_venta)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_detalle_venta_producto
        FOREIGN KEY (id_producto) REFERENCES producto (id_producto)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE devolucion (
    id_devolucion INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_venta INT UNSIGNED NOT NULL,
    id_empresa INT UNSIGNED NOT NULL,
    id_usuario INT UNSIGNED NOT NULL,
    tipo VARCHAR(20) NOT NULL,
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    motivo VARCHAR(255) NULL,
    total_devuelto DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    estado VARCHAR(20) NOT NULL DEFAULT 'CONFIRMADA',
    CONSTRAINT chk_devolucion_tipo CHECK (tipo IN ('PARCIAL', 'TOTAL')),
    CONSTRAINT chk_devolucion_total CHECK (total_devuelto >= 0),
    CONSTRAINT chk_devolucion_estado CHECK (estado IN ('CONFIRMADA', 'ANULADA')),
    CONSTRAINT fk_devolucion_venta
        FOREIGN KEY (id_venta) REFERENCES venta (id_venta)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_devolucion_empresa
        FOREIGN KEY (id_empresa) REFERENCES empresa (id_empresa)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_devolucion_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE detalle_devolucion (
    id_detalle_devolucion INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_devolucion INT UNSIGNED NOT NULL,
    id_detalle_venta INT UNSIGNED NOT NULL,
    id_producto INT UNSIGNED NOT NULL,
    cantidad INT UNSIGNED NOT NULL,
    precio_unitario DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    CONSTRAINT chk_detalle_devolucion_cantidad CHECK (cantidad > 0),
    CONSTRAINT chk_detalle_devolucion_precio CHECK (precio_unitario >= 0),
    CONSTRAINT chk_detalle_devolucion_subtotal CHECK (subtotal >= 0),
    CONSTRAINT fk_detalle_devolucion_devolucion
        FOREIGN KEY (id_devolucion) REFERENCES devolucion (id_devolucion)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_detalle_devolucion_detalle_venta
        FOREIGN KEY (id_detalle_venta) REFERENCES detalle_venta (id_detalle_venta)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_detalle_devolucion_producto
        FOREIGN KEY (id_producto) REFERENCES producto (id_producto)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE movimiento_inventario (
    id_movimiento INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT UNSIGNED NOT NULL,
    id_usuario INT UNSIGNED NOT NULL,
    id_producto INT UNSIGNED NOT NULL,
    tipo_movimiento VARCHAR(30) NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(12,2) NULL,
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tipo_referencia VARCHAR(30) NOT NULL,
    referencia_id INT UNSIGNED NULL,
    motivo VARCHAR(255) NULL,
    CONSTRAINT chk_movimiento_tipo CHECK (tipo_movimiento IN ('ENTRADA', 'VENTA', 'AJUSTE', 'DEVOLUCION', 'PRODUCTO_DEFECTUOSO')),
    CONSTRAINT chk_movimiento_referencia CHECK (tipo_referencia IN ('INGRESO', 'VENTA', 'AJUSTE', 'DEVOLUCION')),
    CONSTRAINT chk_movimiento_precio CHECK (precio_unitario IS NULL OR precio_unitario >= 0),
    CONSTRAINT fk_movimiento_empresa
        FOREIGN KEY (id_empresa) REFERENCES empresa (id_empresa)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_movimiento_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_movimiento_producto
        FOREIGN KEY (id_producto) REFERENCES producto (id_producto)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE prediccion_abastecimiento (
    id_prediccion INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT UNSIGNED NOT NULL,
    fecha_generacion DATE NOT NULL,
    fecha_inicio_periodo DATE NOT NULL,
    fecha_fin_periodo DATE NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'GENERADA',
    CONSTRAINT chk_prediccion_estado CHECK (estado = 'GENERADA'),
    CONSTRAINT chk_prediccion_periodo CHECK (fecha_fin_periodo >= fecha_inicio_periodo),
    CONSTRAINT fk_prediccion_empresa
        FOREIGN KEY (id_empresa) REFERENCES empresa (id_empresa)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE detalle_prediccion (
    id_detalle_prediccion INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_prediccion INT UNSIGNED NOT NULL,
    id_producto INT UNSIGNED NOT NULL,
    cantidad_vendida_periodo INT UNSIGNED NOT NULL DEFAULT 0,
    stock_actual INT UNSIGNED NOT NULL DEFAULT 0,
    cantidad_sugerida_compra INT UNSIGNED NOT NULL DEFAULT 0,
    posicion_mas_vendido INT UNSIGNED NULL,
    observacion VARCHAR(255) NULL,
    CONSTRAINT fk_detalle_prediccion_prediccion
        FOREIGN KEY (id_prediccion) REFERENCES prediccion_abastecimiento (id_prediccion)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_detalle_prediccion_producto
        FOREIGN KEY (id_producto) REFERENCES producto (id_producto)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT uq_detalle_prediccion_producto UNIQUE (id_prediccion, id_producto)
) ENGINE=InnoDB;

CREATE INDEX idx_usuario_empresa ON usuario (id_empresa);
CREATE INDEX idx_producto_empresa ON producto (id_empresa);
CREATE INDEX idx_producto_categoria ON producto (id_categoria);
CREATE INDEX idx_inventario_stock ON inventario (stock_actual);
CREATE INDEX idx_ingreso_empresa_fecha ON ingreso_mercancia (id_empresa, fecha);
CREATE INDEX idx_venta_empresa_fecha ON venta (id_empresa, fecha);
CREATE INDEX idx_venta_metodo_pago ON venta (id_metodo_pago);
CREATE INDEX idx_devolucion_empresa_fecha ON devolucion (id_empresa, fecha);
CREATE INDEX idx_devolucion_venta ON devolucion (id_venta);
CREATE INDEX idx_movimiento_empresa_fecha ON movimiento_inventario (id_empresa, fecha);
CREATE INDEX idx_prediccion_empresa_fecha ON prediccion_abastecimiento (id_empresa, fecha_generacion);

INSERT INTO rol (codigo, nombre, descripcion, estado) VALUES
('ADMIN', 'Administrador del sistema', 'Gestiona la configuración general y las empresas del sistema.', 'ACTIVO'),
('PROP', 'Propietario', 'Administra la información y operación de su empresa.', 'ACTIVO'),
('VEND', 'Vendedor', 'Registra ventas y consulta información operativa.', 'ACTIVO');

INSERT INTO metodo_pago (codigo, nombre, estado) VALUES
('EFECTIVO', 'Efectivo', 'ACTIVO'),
('NEQUI', 'Nequi', 'ACTIVO'),
('DAVIPLATA', 'Daviplata', 'ACTIVO'),
('QR', 'Pago QR', 'ACTIVO'),
('TARJETA', 'Tarjeta', 'ACTIVO'),
('TRANSFERENCIA', 'Transferencia bancaria', 'ACTIVO'),
('OTRO', 'Otro', 'ACTIVO');