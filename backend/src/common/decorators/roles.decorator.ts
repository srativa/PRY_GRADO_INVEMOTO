import { SetMetadata } from '@nestjs/common';
import { RolCodigo } from '../enums/rol-codigo.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: RolCodigo[]) => SetMetadata(ROLES_KEY, roles);
