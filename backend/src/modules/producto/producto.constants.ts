// Límites para evitar valores absurdos, por ejemplo cuando a alguien se le va
// un cero de más al escribir un precio. Son mucho menores que lo máximo que
// la base de datos alcanza a guardar.
export const PRECIO_MAXIMO = 100_000_000;
export const STOCK_MAXIMO = 1_000_000;

// Cuántos movimientos se muestran como máximo en el historial de un producto.
export const MOVIMIENTOS_MAXIMOS = 200;

export const MOTIVO_STOCK_INICIAL = 'Stock inicial al registrar el producto';
