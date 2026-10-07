import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ProductoService } from './producto.service';
import { ProductoEntity } from './entities/producto.entity';
import { InventarioEntity } from './entities/inventario.entity';
import { MovimientoInventarioEntity } from './entities/movimiento-inventario.entity';
import { CategoriaEntity } from '../categoria/entities/categoria.entity';
import { CreateProductoDto } from './dto/create-producto.dto';
import { DisponibilidadProducto } from './dto/listar-productos.dto';
import {
  MOTIVO_STOCK_INICIAL,
  MOVIMIENTOS_MAXIMOS,
} from './producto.constants';
import { RolCodigo } from '../../common/enums/rol-codigo.enum';
import {
  TipoMovimiento,
  TipoReferencia,
} from '../../common/enums/movimiento-inventario.enum';
import { AuthenticatedUser } from '../auth/jwt-payload.interface';

const propietario: AuthenticatedUser = {
  sub: 10,
  idEmpresa: 1,
  rol: RolCodigo.PROP,
};
const vendedor: AuthenticatedUser = {
  sub: 11,
  idEmpresa: 1,
  rol: RolCodigo.VEND,
};

const dtoBase: CreateProductoDto = {
  idCategoria: 3,
  codigoProducto: 'CASCO-001',
  presentacion: 'Unidad',
  nombre: 'Casco integral',
  precioVenta: 250000,
  costo: 160000,
};

function crearProducto(sobrescribir: Partial<ProductoEntity> = {}) {
  return {
    idProducto: 7,
    idEmpresa: 1,
    idCategoria: 3,
    codigoProducto: 'CASCO-001',
    presentacion: null,
    nombre: 'Casco integral',
    descripcion: null,
    precioVenta: '250000.00',
    costo: '160000.00',
    estado: 'ACTIVO',
    ...sobrescribir,
  } as ProductoEntity;
}

function crearInventario(sobrescribir: Partial<InventarioEntity> = {}) {
  return {
    idInventario: 1,
    idProducto: 7,
    stockActual: 10,
    stockMinimo: 2,
    ...sobrescribir,
  } as InventarioEntity;
}

// Imita la herramienta que arma las búsquedas en la base de datos, para poder
// probar sin una base real.
function crearConsultaMock(resultado: ProductoEntity[] = []) {
  return {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(resultado),
  };
}

interface ManagerMock {
  create: jest.Mock;
  save: jest.Mock;
  findOne: jest.Mock;
}

describe('ProductoService', () => {
  let service: ProductoService;
  let productoRepository: {
    findOne: jest.Mock;
    findOneBy: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let categoriaRepository: { findOneBy: jest.Mock };
  let movimientoRepository: { find: jest.Mock };
  let manager: ManagerMock;
  let dataSource: {
    transaction: jest.Mock;
    manager: { save: jest.Mock };
  };

  beforeEach(async () => {
    productoRepository = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      save: jest.fn((producto: ProductoEntity) => Promise.resolve(producto)),
      createQueryBuilder: jest.fn(),
    };
    categoriaRepository = {
      findOneBy: jest.fn().mockResolvedValue({ idCategoria: 3, idEmpresa: 1 }),
    };
    movimientoRepository = { find: jest.fn() };

    manager = {
      create: jest.fn((_clase: unknown, datos: object) => ({ ...datos })),
      save: jest.fn((clase: unknown, entidad: object) =>
        Promise.resolve(
          clase === ProductoEntity ? { ...entidad, idProducto: 50 } : entidad,
        ),
      ),
      findOne: jest.fn(),
    };
    dataSource = {
      transaction: jest.fn((trabajo: (m: ManagerMock) => Promise<unknown>) =>
        trabajo(manager),
      ),
      manager: {
        save: jest.fn((_clase: unknown, entidad: object) =>
          Promise.resolve(entidad),
        ),
      },
    };

    const modulo = await Test.createTestingModule({
      providers: [
        ProductoService,
        {
          provide: getRepositoryToken(ProductoEntity),
          useValue: productoRepository,
        },
        {
          provide: getRepositoryToken(CategoriaEntity),
          useValue: categoriaRepository,
        },
        {
          provide: getRepositoryToken(MovimientoInventarioEntity),
          useValue: movimientoRepository,
        },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = modulo.get(ProductoService);
  });

  describe('crear', () => {
    beforeEach(() => {
      productoRepository.findOneBy.mockResolvedValue(null); // nadie más está usando ese código
    });

    it('toma la empresa del token y crea producto e inventario juntos', async () => {
      const resultado = await service.crear(
        { ...dtoBase, stockInicial: 5, stockMinimo: 2 },
        propietario,
      );

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(manager.create).toHaveBeenCalledWith(
        ProductoEntity,
        expect.objectContaining({
          idEmpresa: 1,
          idCategoria: 3,
          codigoProducto: 'CASCO-001',
          precioVenta: '250000.00',
          costo: '160000.00',
        }),
      );
      expect(manager.save).toHaveBeenCalledWith(
        InventarioEntity,
        expect.objectContaining({
          idProducto: 50,
          stockActual: 5,
          stockMinimo: 2,
        }),
      );
      expect(resultado.inventario.stockActual).toBe(5);
    });

    it('registra el stock inicial en el historial de movimientos', async () => {
      await service.crear({ ...dtoBase, stockInicial: 5 }, propietario);

      expect(manager.save).toHaveBeenCalledWith(
        MovimientoInventarioEntity,
        expect.objectContaining({
          idEmpresa: 1,
          idUsuario: 10,
          idProducto: 50,
          tipoMovimiento: TipoMovimiento.AJUSTE,
          tipoReferencia: TipoReferencia.AJUSTE,
          cantidad: 5,
          motivo: MOTIVO_STOCK_INICIAL,
        }),
      );
    });

    it('no registra movimiento cuando el stock inicial es 0 o no se indica', async () => {
      await service.crear(dtoBase, propietario);
      await service.crear({ ...dtoBase, stockInicial: 0 }, propietario);

      expect(manager.save).not.toHaveBeenCalledWith(
        MovimientoInventarioEntity,
        expect.anything(),
      );
    });

    it('permite al vendedor crear productos (RF-06), costo incluido', async () => {
      const resultado = await service.crear(dtoBase, vendedor);

      expect(resultado.costo).toBe('160000.00');
      expect(resultado.idEmpresa).toBe(1);
    });

    it('el vendedor no puede definir el stock mínimo', async () => {
      await expect(
        service.crear({ ...dtoBase, stockMinimo: 3 }, vendedor),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('el propietario sí puede definir el stock mínimo', async () => {
      await expect(
        service.crear({ ...dtoBase, stockMinimo: 3 }, propietario),
      ).resolves.toBeDefined();
    });

    it('rechaza una categoría de otra empresa', async () => {
      categoriaRepository.findOneBy.mockResolvedValue({
        idCategoria: 3,
        idEmpresa: 2,
      });

      await expect(service.crear(dtoBase, propietario)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('rechaza un código de producto repetido en la empresa', async () => {
      productoRepository.findOneBy.mockResolvedValue(crearProducto());

      await expect(service.crear(dtoBase, propietario)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(productoRepository.findOneBy).toHaveBeenCalledWith({
        idEmpresa: 1,
        codigoProducto: 'CASCO-001',
      });
    });
  });

  describe('listar', () => {
    it('sin filtros solo restringe por la empresa del token', async () => {
      const consulta = crearConsultaMock([crearProducto()]);
      productoRepository.createQueryBuilder.mockReturnValue(consulta);

      const resultado = await service.listar(vendedor);

      expect(resultado).toHaveLength(1);
      expect(consulta.where).toHaveBeenCalledWith(
        'producto.idEmpresa = :idEmpresa',
        { idEmpresa: 1 },
      );
      expect(consulta.andWhere).not.toHaveBeenCalled();
    });

    it('aplica todos los filtros combinados', async () => {
      const consulta = crearConsultaMock();
      productoRepository.createQueryBuilder.mockReturnValue(consulta);

      await service.listar(propietario, {
        nombre: 'casco',
        codigo: 'CAS',
        idCategoria: 3,
        estado: 'ACTIVO',
        disponibilidad: DisponibilidadProducto.DISPONIBLE,
      });

      expect(consulta.andWhere).toHaveBeenCalledWith(
        'producto.nombre LIKE :nombre',
        { nombre: '%casco%' },
      );
      expect(consulta.andWhere).toHaveBeenCalledWith(
        'producto.codigoProducto LIKE :codigo',
        { codigo: '%CAS%' },
      );
      expect(consulta.andWhere).toHaveBeenCalledWith(
        'producto.idCategoria = :idCategoria',
        { idCategoria: 3 },
      );
      expect(consulta.andWhere).toHaveBeenCalledWith(
        'producto.estado = :estado',
        { estado: 'ACTIVO' },
      );
      expect(consulta.andWhere).toHaveBeenCalledWith(
        'inventario.stockActual > 0',
      );
    });

    it('trata %, _ y \\ del texto buscado como caracteres literales', async () => {
      const consulta = crearConsultaMock();
      productoRepository.createQueryBuilder.mockReturnValue(consulta);

      await service.listar(propietario, { nombre: '50%_a\\b' });

      expect(consulta.andWhere).toHaveBeenCalledWith(
        'producto.nombre LIKE :nombre',
        { nombre: '%50\\%\\_a\\\\b%' },
      );
    });

    it.each([
      [DisponibilidadProducto.DISPONIBLE, 'inventario.stockActual > 0'],
      [DisponibilidadProducto.AGOTADO, 'inventario.stockActual = 0'],
      [
        DisponibilidadProducto.BAJO_STOCK,
        '(inventario.stockMinimo IS NOT NULL AND inventario.stockActual <= inventario.stockMinimo)',
      ],
    ])('filtra por disponibilidad %s', async (disponibilidad, condicion) => {
      const consulta = crearConsultaMock();
      productoRepository.createQueryBuilder.mockReturnValue(consulta);

      await service.listar(propietario, { disponibilidad });

      expect(consulta.andWhere).toHaveBeenCalledTimes(1);
      expect(consulta.andWhere).toHaveBeenCalledWith(condicion);
    });
  });

  describe('buscarPorIdConPermiso', () => {
    it('busca el producto restringido a la empresa del token', async () => {
      productoRepository.findOne.mockResolvedValue(crearProducto());

      await service.buscarPorIdConPermiso(7, vendedor);

      expect(productoRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { idProducto: 7, idEmpresa: 1 } }),
      );
    });

    it('un producto de otra empresa responde 404, igual que uno inexistente', async () => {
      productoRepository.findOne.mockResolvedValue(null);

      await expect(
        service.buscarPorIdConPermiso(7, propietario),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('actualizar', () => {
    it('actualiza precio y estado (el vendedor también puede)', async () => {
      productoRepository.findOne.mockResolvedValue(crearProducto());

      const resultado = await service.actualizar(
        7,
        { precioVenta: 1500.5, estado: 'INACTIVO' },
        vendedor,
      );

      expect(resultado.precioVenta).toBe('1500.50');
      expect(resultado.estado).toBe('INACTIVO');
    });

    it('rechaza cambiar el código a uno que ya usa otro producto', async () => {
      productoRepository.findOne.mockResolvedValue(crearProducto());
      productoRepository.findOneBy.mockResolvedValue(
        crearProducto({ idProducto: 99, codigoProducto: 'OTRO' }),
      );

      await expect(
        service.actualizar(7, { codigoProducto: 'OTRO' }, propietario),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rechaza mover el producto a una categoría de otra empresa', async () => {
      productoRepository.findOne.mockResolvedValue(crearProducto());
      categoriaRepository.findOneBy.mockResolvedValue({
        idCategoria: 5,
        idEmpresa: 2,
      });

      await expect(
        service.actualizar(7, { idCategoria: 5 }, propietario),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(productoRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('actualizarStock', () => {
    beforeEach(() => {
      productoRepository.findOne.mockResolvedValue(crearProducto());
      manager.findOne.mockResolvedValue(crearInventario({ stockActual: 10 }));
    });

    it('baja el stock y registra un movimiento negativo con motivo y usuario', async () => {
      await service.actualizarStock(
        7,
        { stockActual: 4, motivo: 'Conteo físico' },
        vendedor,
      );

      expect(manager.save).toHaveBeenCalledWith(
        InventarioEntity,
        expect.objectContaining({ stockActual: 4 }),
      );
      expect(manager.save).toHaveBeenCalledWith(
        MovimientoInventarioEntity,
        expect.objectContaining({
          idEmpresa: 1,
          idUsuario: 11,
          idProducto: 7,
          tipoMovimiento: TipoMovimiento.AJUSTE,
          tipoReferencia: TipoReferencia.AJUSTE,
          cantidad: -6,
          motivo: 'Conteo físico',
        }),
      );
    });

    it('sube el stock y registra un movimiento positivo', async () => {
      await service.actualizarStock(
        7,
        { stockActual: 25, motivo: 'Mercancía encontrada' },
        propietario,
      );

      expect(manager.save).toHaveBeenCalledWith(
        MovimientoInventarioEntity,
        expect.objectContaining({ cantidad: 15, idUsuario: 10 }),
      );
    });

    it('bloquea la fila de inventario durante el ajuste', async () => {
      await service.actualizarStock(
        7,
        { stockActual: 4, motivo: 'Conteo' },
        vendedor,
      );

      expect(manager.findOne).toHaveBeenCalledWith(InventarioEntity, {
        where: { idProducto: 7 },
        lock: { mode: 'pessimistic_write' },
      });
    });

    it('rechaza un ajuste que no cambia el stock y no guarda nada', async () => {
      await expect(
        service.actualizarStock(
          7,
          { stockActual: 10, motivo: 'Sin cambios' },
          vendedor,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('un producto de otra empresa responde 404 sin abrir la transacción', async () => {
      productoRepository.findOne.mockResolvedValue(null);

      await expect(
        service.actualizarStock(
          7,
          { stockActual: 4, motivo: 'Conteo' },
          vendedor,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(productoRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { idProducto: 7, idEmpresa: 1 } }),
      );
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('responde 404 si el producto no tiene fila de inventario', async () => {
      manager.findOne.mockResolvedValue(null);

      await expect(
        service.actualizarStock(
          7,
          { stockActual: 4, motivo: 'Conteo' },
          vendedor,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('actualizarStockMinimo', () => {
    it('cambia solo el umbral y no genera movimiento de inventario', async () => {
      productoRepository.findOne.mockResolvedValue(
        crearProducto({ inventario: crearInventario({ stockMinimo: null }) }),
      );

      await service.actualizarStockMinimo(7, { stockMinimo: 5 }, propietario);

      expect(dataSource.manager.save).toHaveBeenCalledWith(
        InventarioEntity,
        expect.objectContaining({ stockMinimo: 5 }),
      );
      expect(dataSource.transaction).not.toHaveBeenCalled();
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('un producto de otra empresa responde 404', async () => {
      productoRepository.findOne.mockResolvedValue(null);

      await expect(
        service.actualizarStockMinimo(7, { stockMinimo: 5 }, propietario),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('listarMovimientos', () => {
    it('devuelve el historial sin exponer datos sensibles del usuario', async () => {
      const fecha = new Date('2026-10-03T12:00:00Z');
      productoRepository.findOne.mockResolvedValue(crearProducto());
      movimientoRepository.find.mockResolvedValue([
        {
          idMovimiento: 1,
          idEmpresa: 1,
          idUsuario: 11,
          idProducto: 7,
          tipoMovimiento: TipoMovimiento.AJUSTE,
          cantidad: -6,
          fecha,
          motivo: 'Conteo físico',
          usuario: {
            idUsuario: 11,
            nombre: 'Vendedor Uno',
            correo: 'vendedor@motorevolucion.com',
            passwordHash: 'hash-secreto',
          },
        },
      ]);

      const resultado = await service.listarMovimientos(7, propietario);

      expect(resultado).toEqual([
        {
          idMovimiento: 1,
          tipoMovimiento: TipoMovimiento.AJUSTE,
          cantidad: -6,
          fecha,
          motivo: 'Conteo físico',
          usuario: { idUsuario: 11, nombre: 'Vendedor Uno' },
        },
      ]);
    });

    it('consulta solo la empresa del token, del más reciente al más antiguo y con tope', async () => {
      productoRepository.findOne.mockResolvedValue(crearProducto());
      movimientoRepository.find.mockResolvedValue([]);

      await service.listarMovimientos(7, propietario);

      expect(movimientoRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { idProducto: 7, idEmpresa: 1 },
          order: { fecha: 'DESC', idMovimiento: 'DESC' },
          take: MOVIMIENTOS_MAXIMOS,
        }),
      );
    });

    it('un producto de otra empresa responde 404 y no consulta el historial', async () => {
      productoRepository.findOne.mockResolvedValue(null);

      await expect(
        service.listarMovimientos(7, propietario),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(movimientoRepository.find).not.toHaveBeenCalled();
    });
  });
});
