import 'reflect-metadata';
import { CategoriaController } from './categoria.controller';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { RolCodigo } from '../../common/enums/rol-codigo.enum';

function rolesDe(metodo: string): RolCodigo[] | undefined {
  const descriptor = Object.getOwnPropertyDescriptor(
    CategoriaController.prototype,
    metodo,
  );
  return Reflect.getMetadata(ROLES_KEY, descriptor?.value as object) as
    RolCodigo[] | undefined;
}

describe('CategoriaController (permisos por rol)', () => {
  it('exige autenticación y verificación de rol en todas las rutas', () => {
    const guardias = Reflect.getMetadata('__guards__', CategoriaController) as
      unknown[] | undefined;
    expect(guardias).toEqual([JwtAuthGuard, RolesGuard]);
  });

  it.each([
    ['crear', [RolCodigo.PROP]],
    ['actualizar', [RolCodigo.PROP]],
    ['listar', [RolCodigo.PROP, RolCodigo.VEND]],
    ['buscarPorId', [RolCodigo.PROP, RolCodigo.VEND]],
  ])('%s permite solo a %j', (metodo, esperados) => {
    expect(rolesDe(metodo)).toEqual(esperados);
  });
});
