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

// Así se muestra cada movimiento del historial. De la persona que lo hizo
// solo aparecen su número y su nombre, nada más.
export interface MovimientoRespuesta {
  idMovimiento: number;
  tipoMovimiento: string;
  cantidad: number;
  fecha: Date;
  motivo: string | null;
  usuario: { idUsuario: number; nombre: string };
}

// Prepara lo que se escribe en el buscador para encontrar los productos que
// contengan ese texto. Los símbolos %, _ y \ se buscan tal cual; si no,
// buscar "50%" mostraría cualquier producto.
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

  // Registrar producto (HU-04). El producto, su inventario y, si empieza con
  // unidades, su primer movimiento del historial se guardan juntos: o se
  // guarda todo o no se guarda nada. Nunca puede quedar un producto sin
  // inventario ni unidades sin historial.
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

  // Consultar inventario (HU-06, RF-08). El propietario y el vendedor ven los
  // productos de su propia empresa con sus unidades, y pueden filtrarlos.
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

  // Si alguien pide un producto de otra empresa, el sistema responde como si
  // no existiera. Así nadie puede averiguar qué datos tienen los demás
  // negocios.
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

  // Actualizar stock (HU-05). Se pone el stock en la cantidad indicada, y en
  // el historial queda cuánto subió o bajó, el motivo y quién lo hizo.
  // Mientras se hace el cambio, el producto queda apartado para que, si dos
  // personas ajustan el stock al mismo tiempo, las cuentas no se descuadren.
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

  // Stock mínimo (RF-15). Es solo el punto en el que el sistema avisa que
  // queda poco; no mueve mercancía, por eso no aparece en el historial.
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

  // Historial de un producto (RF-14), del movimiento más reciente al más
  // antiguo, sin pasar del máximo que está en producto.constants.ts.
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
