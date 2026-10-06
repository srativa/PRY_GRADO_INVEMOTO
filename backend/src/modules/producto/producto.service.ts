import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ProductoEntity } from './entities/producto.entity';
import { InventarioEntity } from './entities/inventario.entity';
import { MovimientoInventarioEntity } from './entities/movimiento-inventario.entity';
import { CategoriaEntity } from '../categoria/entities/categoria.entity';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { UpdateStockMinimoDto } from './dto/update-stock-minimo.dto';
import {
  DisponibilidadProducto,
  ListarProductosQueryDto,
} from './dto/listar-productos.dto';
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

// Forma pública de un movimiento del historial. Se arma a mano para no exponer
// datos del usuario más allá de su id y nombre.
export interface MovimientoRespuesta {
  idMovimiento: number;
  tipoMovimiento: string;
  cantidad: number;
  fecha: Date;
  motivo: string | null;
  usuario: { idUsuario: number; nombre: string };
}

// Convierte un texto en un patrón LIKE "contiene", tratando %, _ y \ como
// caracteres literales (si no, buscar "50%" coincidiría con cualquier cosa).
function patronContiene(texto: string): string {
  return `%${texto.replace(/[\\%_]/g, '\\$&')}%`;
}

@Injectable()
export class ProductoService {
  constructor(
    @InjectRepository(ProductoEntity)
    private readonly productoRepository: Repository<ProductoEntity>,
    @InjectRepository(CategoriaEntity)
    private readonly categoriaRepository: Repository<CategoriaEntity>,
    @InjectRepository(MovimientoInventarioEntity)
    private readonly movimientoRepository: Repository<MovimientoInventarioEntity>,
    private readonly dataSource: DataSource,
  ) {}

  // HU-04 Registrar producto. Crea producto + su fila de inventario (y, si hay
  // stock inicial, su movimiento en el historial) en una sola transacción: un
  // producto nunca debe existir sin inventario ni con stock sin historial.
  async crear(
    dto: CreateProductoDto,
    creador: AuthenticatedUser,
  ): Promise<ProductoEntity> {
    if (creador.rol === RolCodigo.VEND && dto.stockMinimo !== undefined) {
      throw new ForbiddenException(
        'Solo el propietario puede definir el stock mínimo.',
      );
    }

    await this.verificarCategoriaDeLaEmpresa(
      dto.idCategoria,
      creador.idEmpresa,
    );
    await this.verificarCodigoDisponible(creador.idEmpresa, dto.codigoProducto);

    return this.dataSource.transaction(async (manager) => {
      const producto = manager.create(ProductoEntity, {
        idEmpresa: creador.idEmpresa,
        idCategoria: dto.idCategoria,
        codigoProducto: dto.codigoProducto,
        presentacion: dto.presentacion ?? null,
        nombre: dto.nombre,
        descripcion: dto.descripcion ?? null,
        precioVenta: dto.precioVenta.toFixed(2),
        costo: dto.costo.toFixed(2),
      });
      const productoGuardado = await manager.save(ProductoEntity, producto);

      const stockInicial = dto.stockInicial ?? 0;
      const inventario = manager.create(InventarioEntity, {
        idProducto: productoGuardado.idProducto,
        stockActual: stockInicial,
        stockMinimo: dto.stockMinimo ?? null,
      });
      await manager.save(InventarioEntity, inventario);

      if (stockInicial > 0) {
        const movimiento = manager.create(MovimientoInventarioEntity, {
          idEmpresa: creador.idEmpresa,
          idUsuario: creador.sub,
          idProducto: productoGuardado.idProducto,
          tipoMovimiento: TipoMovimiento.AJUSTE,
          cantidad: stockInicial,
          precioUnitario: null,
          tipoReferencia: TipoReferencia.AJUSTE,
          referenciaId: null,
          motivo: MOTIVO_STOCK_INICIAL,
        });
        await manager.save(MovimientoInventarioEntity, movimiento);
      }

      productoGuardado.inventario = inventario;
      return productoGuardado;
    });
  }

  // HU-06 Consultar inventario (RF-08). PROP y VEND ven el catálogo de su
  // propia empresa, con el stock incluido, y pueden filtrarlo.
  async listar(
    usuario: AuthenticatedUser,
    filtros: ListarProductosQueryDto = {},
  ): Promise<ProductoEntity[]> {
    const consulta = this.productoRepository
      .createQueryBuilder('producto')
      .leftJoinAndSelect('producto.categoria', 'categoria')
      .leftJoinAndSelect('producto.inventario', 'inventario')
      .where('producto.idEmpresa = :idEmpresa', {
        idEmpresa: usuario.idEmpresa,
      })
      .orderBy('producto.nombre', 'ASC');

    if (filtros.nombre) {
      consulta.andWhere('producto.nombre LIKE :nombre', {
        nombre: patronContiene(filtros.nombre),
      });
    }
    if (filtros.codigo) {
      consulta.andWhere('producto.codigoProducto LIKE :codigo', {
        codigo: patronContiene(filtros.codigo),
      });
    }
    if (filtros.idCategoria) {
      consulta.andWhere('producto.idCategoria = :idCategoria', {
        idCategoria: filtros.idCategoria,
      });
    }
    if (filtros.estado) {
      consulta.andWhere('producto.estado = :estado', {
        estado: filtros.estado,
      });
    }
    if (filtros.disponibilidad === DisponibilidadProducto.DISPONIBLE) {
      consulta.andWhere('inventario.stockActual > 0');
    } else if (filtros.disponibilidad === DisponibilidadProducto.AGOTADO) {
      consulta.andWhere('inventario.stockActual = 0');
    } else if (filtros.disponibilidad === DisponibilidadProducto.BAJO_STOCK) {
      consulta.andWhere(
        '(inventario.stockMinimo IS NOT NULL AND inventario.stockActual <= inventario.stockMinimo)',
      );
    }

    return consulta.getMany();
  }

  // Un producto de otra empresa responde igual que uno inexistente (404), para
  // no revelar a otras empresas qué ids existen.
  async buscarPorIdConPermiso(
    id: number,
    usuario: AuthenticatedUser,
  ): Promise<ProductoEntity> {
    const producto = await this.productoRepository.findOne({
      where: { idProducto: id, idEmpresa: usuario.idEmpresa },
      relations: { categoria: true, inventario: true },
    });
    if (!producto) {
      throw new NotFoundException('Producto no encontrado.');
    }
    return producto;
  }

  async actualizar(
    id: number,
    dto: UpdateProductoDto,
    usuario: AuthenticatedUser,
  ): Promise<ProductoEntity> {
    const producto = await this.buscarPorIdConPermiso(id, usuario);

    if (
      dto.idCategoria !== undefined &&
      dto.idCategoria !== producto.idCategoria
    ) {
      await this.verificarCategoriaDeLaEmpresa(
        dto.idCategoria,
        usuario.idEmpresa,
      );
      producto.idCategoria = dto.idCategoria;
    }
    if (
      dto.codigoProducto !== undefined &&
      dto.codigoProducto !== producto.codigoProducto
    ) {
      await this.verificarCodigoDisponible(
        usuario.idEmpresa,
        dto.codigoProducto,
        id,
      );
      producto.codigoProducto = dto.codigoProducto;
    }
    if (dto.presentacion !== undefined) {
      producto.presentacion = dto.presentacion;
    }
    if (dto.nombre !== undefined) producto.nombre = dto.nombre;
    if (dto.descripcion !== undefined) producto.descripcion = dto.descripcion;
    if (dto.precioVenta !== undefined) {
      producto.precioVenta = dto.precioVenta.toFixed(2);
    }
    if (dto.costo !== undefined) producto.costo = dto.costo.toFixed(2);
    if (dto.estado !== undefined) producto.estado = dto.estado;

    return this.productoRepository.save(producto);
  }

  // HU-05 Actualizar stock. Es un ajuste: cambia el stock al valor indicado y
  // deja un movimiento en el historial con la diferencia (con signo), el motivo
  // y el usuario responsable. La fila de inventario se bloquea durante la
  // transacción para que dos ajustes simultáneos no descuadren el historial.
  async actualizarStock(
    id: number,
    dto: UpdateStockDto,
    usuario: AuthenticatedUser,
  ): Promise<InventarioEntity> {
    await this.buscarPorIdConPermiso(id, usuario);

    return this.dataSource.transaction(async (manager) => {
      const inventario = await manager.findOne(InventarioEntity, {
        where: { idProducto: id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!inventario) {
        throw new NotFoundException(
          'Este producto no tiene una fila de inventario asociada.',
        );
      }

      const diferencia = dto.stockActual - inventario.stockActual;
      if (diferencia === 0) {
        throw new BadRequestException(
          'El stock indicado es igual al actual: no hay nada que ajustar.',
        );
      }

      inventario.stockActual = dto.stockActual;
      const inventarioGuardado = await manager.save(
        InventarioEntity,
        inventario,
      );

      const movimiento = manager.create(MovimientoInventarioEntity, {
        idEmpresa: usuario.idEmpresa,
        idUsuario: usuario.sub,
        idProducto: id,
        tipoMovimiento: TipoMovimiento.AJUSTE,
        cantidad: diferencia,
        precioUnitario: null,
        tipoReferencia: TipoReferencia.AJUSTE,
        referenciaId: null,
        motivo: dto.motivo,
      });
      await manager.save(MovimientoInventarioEntity, movimiento);

      return inventarioGuardado;
    });
  }

  // RF-15 Stock mínimo. Es un umbral de alerta, no un movimiento de mercancía,
  // por eso no genera registro en el historial de movimientos.
  async actualizarStockMinimo(
    id: number,
    dto: UpdateStockMinimoDto,
    usuario: AuthenticatedUser,
  ): Promise<InventarioEntity> {
    const producto = await this.buscarPorIdConPermiso(id, usuario);
    const inventario = producto.inventario;
    if (!inventario) {
      throw new NotFoundException(
        'Este producto no tiene una fila de inventario asociada.',
      );
    }

    inventario.stockMinimo = dto.stockMinimo;
    return this.dataSource.manager.save(InventarioEntity, inventario);
  }

  // RF-14 Historial de movimientos de un producto, del más reciente al más
  // antiguo (máximo MOVIMIENTOS_MAXIMOS registros).
  async listarMovimientos(
    id: number,
    usuario: AuthenticatedUser,
  ): Promise<MovimientoRespuesta[]> {
    await this.buscarPorIdConPermiso(id, usuario);

    const movimientos = await this.movimientoRepository.find({
      where: { idProducto: id, idEmpresa: usuario.idEmpresa },
      relations: { usuario: true },
      order: { fecha: 'DESC', idMovimiento: 'DESC' },
      take: MOVIMIENTOS_MAXIMOS,
    });

    return movimientos.map((movimiento) => ({
      idMovimiento: movimiento.idMovimiento,
      tipoMovimiento: movimiento.tipoMovimiento,
      cantidad: movimiento.cantidad,
      fecha: movimiento.fecha,
      motivo: movimiento.motivo,
      usuario: {
        idUsuario: movimiento.usuario.idUsuario,
        nombre: movimiento.usuario.nombre,
      },
    }));
  }

  private async verificarCategoriaDeLaEmpresa(
    idCategoria: number,
    idEmpresa: number,
  ): Promise<void> {
    const categoria = await this.categoriaRepository.findOneBy({
      idCategoria,
    });
    if (!categoria || categoria.idEmpresa !== idEmpresa) {
      throw new NotFoundException(
        'La categoría indicada no existe en tu empresa.',
      );
    }
  }

  private async verificarCodigoDisponible(
    idEmpresa: number,
    codigoProducto: string,
    idProductoExcluido?: number,
  ): Promise<void> {
    const existente = await this.productoRepository.findOneBy({
      idEmpresa,
      codigoProducto,
    });
    if (existente && existente.idProducto !== idProductoExcluido) {
      throw new ConflictException(
        'Ya existe un producto con ese código en tu empresa.',
      );
    }
  }
}
