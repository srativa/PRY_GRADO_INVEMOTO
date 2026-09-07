import { RolCodigo } from '../../common/enums/rol-codigo.enum';

// Payload firmado dentro del JWT (ver AuthService.login).
export interface JwtPayload {
  sub: number; // id_usuario
  idEmpresa: number;
  rol: RolCodigo;
}

// Forma de `req.user` una vez que JwtStrategy valida el token.
export type AuthenticatedUser = JwtPayload;
