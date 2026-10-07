// Estos valores tienen que ser los mismos que acepta la tabla de movimientos
// en la base de datos. Si se cambia uno aquí, hay que cambiarlo también allá.
export enum TipoMovimiento {
  ENTRADA = 'ENTRADA',
  VENTA = 'VENTA',
  AJUSTE = 'AJUSTE',
  DEVOLUCION = 'DEVOLUCION',
  PRODUCTO_DEFECTUOSO = 'PRODUCTO_DEFECTUOSO',
}

export enum TipoReferencia {
  INGRESO = 'INGRESO',
  VENTA = 'VENTA',
  AJUSTE = 'AJUSTE',
  DEVOLUCION = 'DEVOLUCION',
}
