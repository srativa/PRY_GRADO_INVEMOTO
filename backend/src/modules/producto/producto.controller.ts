import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolCodigo } from '../../common/enums/rol-codigo.enum';
import { ProductoService } from './producto.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { UpdateStockMinimoDto } from './dto/update-stock-minimo.dto';
import { ListarProductosQueryDto } from './dto/listar-productos.dto';
import type { AuthenticatedUser } from '../auth/jwt-payload.interface';

@Controller('productos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductoController {
  constructor(private readonly productoService: ProductoService) {}

  // HU-04 Registrar producto (RF-06) — PROP y VEND. El vendedor no puede
  // definir el stock mínimo al crear (lo valida el service).
  @Post()
  @Roles(RolCodigo.PROP, RolCodigo.VEND)
  crear(
    @Body() dto: CreateProductoDto,
    @CurrentUser() creador: AuthenticatedUser,
  ) {
    return this.productoService.crear(dto, creador);
  }

  // HU-06 Consultar inventario (RF-08) — PROP y VEND. Filtros opcionales por
  // nombre, código, categoría, estado y disponibilidad.
  @Get()
  @Roles(RolCodigo.PROP, RolCodigo.VEND)
  listar(
    @CurrentUser() usuario: AuthenticatedUser,
    @Query() filtros: ListarProductosQueryDto,
  ) {
    return this.productoService.listar(usuario, filtros);
  }

  @Get(':id')
  @Roles(RolCodigo.PROP, RolCodigo.VEND)
  buscarPorId(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.productoService.buscarPorIdConPermiso(id, usuario);
  }

  // RF-14 Historial de movimientos de inventario del producto — solo PROP.
  @Get(':id/movimientos')
  @Roles(RolCodigo.PROP)
  listarMovimientos(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.productoService.listarMovimientos(id, usuario);
  }

  // RF-06: modificar, activar o desactivar un producto se hace con este mismo
  // endpoint mandando { "estado": "INACTIVO" } o { "estado": "ACTIVO" } — no hay
  // DELETE real. PROP y VEND.
  @Patch(':id')
  @Roles(RolCodigo.PROP, RolCodigo.VEND)
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.productoService.actualizar(id, dto, usuario);
  }

  // HU-05 Ajustar stock — PROP y VEND. Exige motivo y deja el movimiento en el
  // historial (RF-11, RF-14).
  @Patch(':id/stock')
  @Roles(RolCodigo.PROP, RolCodigo.VEND)
  actualizarStock(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStockDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.productoService.actualizarStock(id, dto, usuario);
  }

  // RF-15 Stock mínimo — solo PROP.
  @Patch(':id/stock-minimo')
  @Roles(RolCodigo.PROP)
  actualizarStockMinimo(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStockMinimoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.productoService.actualizarStockMinimo(id, dto, usuario);
  }
}
