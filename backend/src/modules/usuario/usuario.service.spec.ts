import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsuarioService } from './usuario.service';
import { UsuarioEntity } from './entities/usuario.entity';
import { RolEntity } from '../rol/entities/rol.entity';
import { EmpresaEntity } from '../empresa/entities/empresa.entity';
import { RolCodigo } from '../../common/enums/rol-codigo.enum';
import { AuthenticatedUser } from '../auth/jwt-payload.interface';

const admin: AuthenticatedUser = { sub: 1, idEmpresa: 1, rol: RolCodigo.ADMIN };
const propietario: AuthenticatedUser = {
  sub: 10,
  idEmpresa: 2,
  rol: RolCodigo.PROP,
};
const vendedor: AuthenticatedUser = {
  sub: 11,
  idEmpresa: 2,
  rol: RolCodigo.VEND,
};

function crearUsuario(idEmpresa: number, rol: RolCodigo) {
  return {
    idUsuario: 50,
    idEmpresa,
    nombre: 'Usuario de prueba',
    rol: { codigo: rol },
  } as UsuarioEntity;
}

describe('UsuarioService.buscarPorIdConPermiso', () => {
  let service: UsuarioService;
  let usuarioRepository: { findOne: jest.Mock };

  beforeEach(async () => {
    usuarioRepository = { findOne: jest.fn() };

    const modulo = await Test.createTestingModule({
      providers: [
        UsuarioService,
        {
          provide: getRepositoryToken(UsuarioEntity),
          useValue: usuarioRepository,
        },
        { provide: getRepositoryToken(RolEntity), useValue: {} },
        { provide: getRepositoryToken(EmpresaEntity), useValue: {} },
      ],
    }).compile();

    service = modulo.get(UsuarioService);
  });

  it('responde 404 si el usuario no existe', async () => {
    usuarioRepository.findOne.mockResolvedValue(null);

    await expect(
      service.buscarPorIdConPermiso(50, propietario),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('PROP: un usuario de otra empresa responde 404, no 403 (no revela que existe)', async () => {
    usuarioRepository.findOne.mockResolvedValue(
      crearUsuario(99, RolCodigo.VEND),
    );

    await expect(
      service.buscarPorIdConPermiso(50, propietario),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('PROP: un usuario de su empresa que no es vendedor responde 403', async () => {
    usuarioRepository.findOne.mockResolvedValue(
      crearUsuario(2, RolCodigo.PROP),
    );

    await expect(
      service.buscarPorIdConPermiso(50, propietario),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('PROP: puede ver un vendedor de su propia empresa', async () => {
    const vendedorPropio = crearUsuario(2, RolCodigo.VEND);
    usuarioRepository.findOne.mockResolvedValue(vendedorPropio);

    await expect(service.buscarPorIdConPermiso(50, propietario)).resolves.toBe(
      vendedorPropio,
    );
  });

  it('ADMIN: puede ver un propietario de cualquier empresa', async () => {
    const otroPropietario = crearUsuario(99, RolCodigo.PROP);
    usuarioRepository.findOne.mockResolvedValue(otroPropietario);

    await expect(service.buscarPorIdConPermiso(50, admin)).resolves.toBe(
      otroPropietario,
    );
  });

  it('ADMIN: no puede gestionar un vendedor', async () => {
    usuarioRepository.findOne.mockResolvedValue(
      crearUsuario(99, RolCodigo.VEND),
    );

    await expect(
      service.buscarPorIdConPermiso(50, admin),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('VEND: no tiene permiso para gestionar usuarios', async () => {
    usuarioRepository.findOne.mockResolvedValue(
      crearUsuario(2, RolCodigo.VEND),
    );

    await expect(
      service.buscarPorIdConPermiso(50, vendedor),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
