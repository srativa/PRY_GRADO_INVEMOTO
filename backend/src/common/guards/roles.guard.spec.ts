import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { RolCodigo } from '../enums/rol-codigo.enum';
import { AuthenticatedUser } from '../../modules/auth/jwt-payload.interface';

function crearContexto(user?: AuthenticatedUser): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('permite el paso cuando la ruta no tiene @Roles()', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(crearContexto())).toBe(true);
  });

  it('permite el paso cuando el rol del usuario esta en la lista requerida', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([RolCodigo.ADMIN, RolCodigo.PROP]);
    const user: AuthenticatedUser = {
      sub: 1,
      idEmpresa: 1,
      rol: RolCodigo.PROP,
    };
    expect(guard.canActivate(crearContexto(user))).toBe(true);
  });

  it('bloquea cuando el rol del usuario no esta en la lista requerida', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([RolCodigo.ADMIN, RolCodigo.PROP]);
    const user: AuthenticatedUser = {
      sub: 1,
      idEmpresa: 1,
      rol: RolCodigo.VEND,
    };
    expect(guard.canActivate(crearContexto(user))).toBe(false);
  });

  it('bloquea cuando la ruta requiere roles pero no hay usuario autenticado', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([RolCodigo.ADMIN]);
    expect(guard.canActivate(crearContexto(undefined))).toBe(false);
  });
});
