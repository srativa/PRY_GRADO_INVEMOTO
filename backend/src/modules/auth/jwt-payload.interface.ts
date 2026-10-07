import { RolCodigo } from '../../common/enums/rol-codigo.enum';

// Datos que van guardados dentro del pase de acceso que recibe cada persona
// al iniciar sesión.
export interface JwtPayload {
  sub: number; // número que identifica al usuario
  idEmpresa: number;
  rol: RolCodigo;
}

// Datos de la persona que inició sesión, ya comprobados. Son los que usa el
// resto del sistema.
export type AuthenticatedUser = JwtPayload;
