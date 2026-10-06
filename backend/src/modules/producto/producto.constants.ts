// Topes de negocio: evitan valores absurdos (p. ej. un cero de más al digitar).
// Están muy por debajo del límite físico de las columnas (DECIMAL(12,2) e INT).
export const PRECIO_MAXIMO = 100_000_000;
export const STOCK_MAXIMO = 1_000_000;

// Cantidad máxima de movimientos que devuelve el historial de un producto.
export const MOVIMIENTOS_MAXIMOS = 200;

export const MOTIVO_STOCK_INICIAL = 'Stock inicial al registrar el producto';
