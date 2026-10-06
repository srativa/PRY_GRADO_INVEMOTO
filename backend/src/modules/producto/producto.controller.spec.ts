import 'reflect-metadata';
import { ProductoController } from './producto.controller';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { RolCodigo } from '../../common/enums/rol-codigo.enum';

function rolesDe(metodo: string): RolCodigo[] | undefined {
  const descriptor = Object.getOwnPropertyDescriptor(
    ProductoController.prototype,
    metodo,
  );
  return Reflect.getMetadata(ROLES_KEY, descriptor?.value as object) as
    RolCodigo[] | undefined;
}

describe('ProductoController (permisos por rol)', () => {
  it('exige autenticación y verificación de rol en todas las rutas', () => {
    const guardias = Reflect.getMetadata('__guards__', ProductoController) as
      unknown[] | undefined;
    expect(guardias).toEqual([JwtAuthGuard, RolesGuard]);
  });

  it.each([
    ['crear', [RolCodigo.PROP, RolCodigo.VEND]],
    ['listar', [RolCodigo.PROP, RolCodigo.VEND]],
    ['buscarPorId', [RolCodigo.PROP, RolCodigo.VEND]],
    ['actualizar', [RolCodigo.PROP, RolCodigo.VEND]],
    ['actualizarStock', [RolCodigo.PROP, RolCodigo.VEND]],
    ['actualizarStockMinimo', [RolCodigo.PROP]],
    ['listarMovimientos', [RolCodigo.PROP]],
  ])('%s permite solo a %j', (metodo, esperados) => {
    expect(rolesDe(metodo)).toEqual(esperados);
  });

  it('el administrador de plataforma no tiene acceso a ninguna ruta', () => {
    for (const metodo of [
      'crear',
      'listar',
      'buscarPorId',
      'actualizar',
      'actualizarStock',
      'actualizarStockMinimo',
      'listarMovimientos',
    ]) {
      expect(rolesDe(metodo)).not.toContain(RolCodigo.ADMIN);
    }
  });
});
