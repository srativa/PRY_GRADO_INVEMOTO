// Deben coincidir exactamente con los CHECK de la tabla `movimiento_inventario`
// (invemoto_schema_mysql8.sql: chk_movimiento_tipo y chk_movimiento_referencia).
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
