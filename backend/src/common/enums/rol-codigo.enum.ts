// Debe coincidir exactamente con los valores sembrados en la tabla `rol`
// (invemoto_schema_mysql8.sql -> INSERT INTO rol ...).
export enum RolCodigo {
  ADMIN = 'ADMIN',
  PROP = 'PROP',
  VEND = 'VEND',
}
