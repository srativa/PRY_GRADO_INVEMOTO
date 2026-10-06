import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CategoriaService } from './categoria.service';
import { CategoriaEntity } from './entities/categoria.entity';
import { RolCodigo } from '../../common/enums/rol-codigo.enum';
import { AuthenticatedUser } from '../auth/jwt-payload.interface';

const propietario: AuthenticatedUser = {
  sub: 10,
  idEmpresa: 1,
  rol: RolCodigo.PROP,
};

function crearCategoria(
  sobrescribir: Partial<CategoriaEntity> = {},
): CategoriaEntity {
  return {
    idCategoria: 3,
    idEmpresa: 1,
    nombre: 'Cascos',
    descripcion: null,
    estado: 'ACTIVO',
    ...sobrescribir,
  };
}

describe('CategoriaService', () => {
  let service: CategoriaService;
  let repository: {
    find: jest.Mock;
    findOneBy: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      find: jest.fn(),
      findOneBy: jest.fn(),
      create: jest.fn((datos: object) => ({ ...datos })),
      save: jest.fn((categoria: CategoriaEntity) => Promise.resolve(categoria)),
    };

    const modulo = await Test.createTestingModule({
      providers: [
        CategoriaService,
        { provide: getRepositoryToken(CategoriaEntity), useValue: repository },
      ],
    }).compile();

    service = modulo.get(CategoriaService);
  });

  describe('crear', () => {
    it('toma la empresa del token', async () => {
      repository.findOneBy.mockResolvedValue(null);

      await service.crear({ nombre: 'Cascos' }, propietario);

      expect(repository.create).toHaveBeenCalledWith({
        idEmpresa: 1,
        nombre: 'Cascos',
        descripcion: null,
      });
    });

    it('rechaza un nombre repetido en la misma empresa', async () => {
      repository.findOneBy.mockResolvedValue(crearCategoria());

      await expect(
        service.crear({ nombre: 'Cascos' }, propietario),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repository.findOneBy).toHaveBeenCalledWith({
        idEmpresa: 1,
        nombre: 'Cascos',
      });
    });
  });

  describe('listar', () => {
    it('devuelve solo las categorías de la empresa del token', async () => {
      repository.find.mockResolvedValue([crearCategoria()]);

      await service.listar(propietario);

      expect(repository.find).toHaveBeenCalledWith({
        where: { idEmpresa: 1 },
      });
    });
  });

  describe('buscarPorIdConPermiso', () => {
    it('busca restringido a la empresa del token', async () => {
      repository.findOneBy.mockResolvedValue(crearCategoria());

      await service.buscarPorIdConPermiso(3, propietario);

      expect(repository.findOneBy).toHaveBeenCalledWith({
        idCategoria: 3,
        idEmpresa: 1,
      });
    });

    it('una categoría de otra empresa responde 404, igual que una inexistente', async () => {
      repository.findOneBy.mockResolvedValue(null);

      await expect(
        service.buscarPorIdConPermiso(3, propietario),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('actualizar', () => {
    it('desactiva la categoría cambiando su estado', async () => {
      repository.findOneBy.mockResolvedValue(crearCategoria());

      const resultado = await service.actualizar(
        3,
        { estado: 'INACTIVO' },
        propietario,
      );

      expect(resultado.estado).toBe('INACTIVO');
    });

    it('rechaza renombrar a un nombre que ya usa otra categoría', async () => {
      repository.findOneBy
        .mockResolvedValueOnce(crearCategoria()) // buscarPorIdConPermiso
        .mockResolvedValueOnce(
          crearCategoria({ idCategoria: 8, nombre: 'Guantes' }),
        ); // verificarNombreDisponible

      await expect(
        service.actualizar(3, { nombre: 'Guantes' }, propietario),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('no valida duplicados si el nombre no cambia', async () => {
      repository.findOneBy.mockResolvedValue(crearCategoria());

      await service.actualizar(
        3,
        { nombre: 'Cascos', descripcion: 'Protección' },
        propietario,
      );

      expect(repository.findOneBy).toHaveBeenCalledTimes(1);
    });
  });
});
