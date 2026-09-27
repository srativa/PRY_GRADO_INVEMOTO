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
import { CategoriaEntity } from '../categoria/entities/categoria.entity';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { AuthenticatedUser } from '../auth/jwt-payload.interface';

@Injectable()
export class ProductoService {
  constructor(
    @InjectRepository(ProductoEntity)
    private readonly productoRepository: Repository<ProductoEntity>,
    @InjectRepository(CategoriaEntity)
    private readonly categoriaRepository: Repository<CategoriaEntity>,
    private readonly dataSource: DataSource,
  ) {}

  // HU-04 Registrar producto. Crea producto + su fila de inventario en una
  // sola transacción: un producto nunca debe existir sin inventario.
  async crear(
    dto: CreateProductoDto,
    creador: AuthenticatedUser,
  ): Promise<ProductoEntity> {
    await this.verificarCategoriaDeLaEmpresa(dto.idCategoria, creador.idEmpresa);
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
      const productoGuardado = await manager.save(producto);

      const inventario = manager.create(InventarioEntity, {
        idProducto: productoGuardado.idProducto,
        stockActual: dto.stockInicial ?? 0,
        stockMinimo: dto.stockMinimo ?? null,
      });
      await manager.save(inventario);

      productoGuardado.inventario = inventario;
      return productoGuardado;
    });
  }

  // HU-06 Consultar inventario (listado). PROP y VEND ven el catálogo
  // completo de su propia empresa, con el stock incluido.
  async listar(
    usuario: AuthenticatedUser,
    idCategoria?: number,
  ): Promise<ProductoEntity[]> {
    return this.productoRepository.find({
      where: {
        idEmpresa: usuario.idEmpresa,
        ...(idCategoria ? { idCategoria } : {}),
      },
      relations: { categoria: true, inventario: true },
      order: { nombre: 'ASC' },
    });
  }

  async buscarPorIdConPermiso(
    id: number,
    usuario: AuthenticatedUser,
  ): Promise<ProductoEntity> {
    const producto = await this.productoRepository.findOne({
      where: { idProducto: id },
      relations: { categoria: true, inventario: true },
    });
    if (!producto) {
      throw new NotFoundException('Producto no encontrado.');
    }
    if (producto.idEmpresa !== usuario.idEmpresa) {
      throw new ForbiddenException('El producto no pertenece a tu empresa.');
    }
    return producto;
  }

  async actualizar(
    id: number,
    dto: UpdateProductoDto,
    creador: AuthenticatedUser,
  ): Promise<ProductoEntity> {
    const producto = await this.buscarPorIdConPermiso(id, creador);

    if (
      dto.idCategoria !== undefined &&
      dto.idCategoria !== producto.idCategoria
    ) {
      await this.verificarCategoriaDeLaEmpresa(
        dto.idCategoria,
        creador.idEmpresa,
      );
      producto.idCategoria = dto.idCategoria;
    }
    if (
      dto.codigoProducto !== undefined &&
      dto.codigoProducto !== producto.codigoProducto
    ) {
      await this.verificarCodigoDisponible(
        creador.idEmpresa,
        dto.codigoProducto,
        id,
      );
      producto.codigoProducto = dto.codigoProducto;
    }
    if (dto.presentacion !== undefined) producto.presentacion = dto.presentacion;
    if (dto.nombre !== undefined) producto.nombre = dto.nombre;
    if (dto.descripcion !== undefined) producto.descripcion = dto.descripcion;
    if (dto.precioVenta !== undefined)
      producto.precioVenta = dto.precioVenta.toFixed(2);
    if (dto.costo !== undefined) producto.costo = dto.costo.toFixed(2);
    if (dto.estado !== undefined) producto.estado = dto.estado;

    return this.productoRepository.save(producto);
  }

  // HU-05 Actualizar stock. PROP y VEND pueden corregir el stock (p. ej.
  // tras un conteo físico) y/o el umbral de bajo stock (HU-28).
  async actualizarStock(
    id: number,
    dto: UpdateStockDto,
    usuario: AuthenticatedUser,
  ): Promise<InventarioEntity> {
    if (dto.stockActual === undefined && dto.stockMinimo === undefined) {
      throw new BadRequestException(
        'Debes indicar stockActual o stockMinimo.',
      );
    }

    const producto = await this.buscarPorIdConPermiso(id, usuario);
    const inventario = producto.inventario;
    if (!inventario) {
      // No debería ocurrir: crear() siempre genera el inventario junto al
      // producto. Se deja como salvaguarda ante datos inconsistentes.
      throw new NotFoundException(
        'Este producto no tiene una fila de inventario asociada.',
      );
    }

    if (dto.stockActual !== undefined) inventario.stockActual = dto.stockActual;
    if (dto.stockMinimo !== undefined) inventario.stockMinimo = dto.stockMinimo;

    return this.dataSource.manager.save(InventarioEntity, inventario);
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
