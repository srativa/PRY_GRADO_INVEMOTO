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

  // Registrar producto (HU-04, RF-06). Lo pueden hacer el propietario y el
  // vendedor, pero el vendedor no puede fijar el stock mínimo.
  @Post()
  @Roles(RolCodigo.PROP, RolCodigo.VEND)
  crear(
    @Body() dto: CreateProductoDto,
    @CurrentUser() creador: AuthenticatedUser,
  ) {
    return this.productoService.crear(dto, creador);
  }

  // Consultar inventario (HU-06, RF-08). El propietario y el vendedor pueden
  // buscar por nombre, código, categoría, estado y disponibilidad.
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

  // Historial de movimientos de un producto (RF-14). Solo lo ve el propietario.
  @Get(':id/movimientos')
  @Roles(RolCodigo.PROP)
  listarMovimientos(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.productoService.listarMovimientos(id, usuario);
  }

  // Modificar, activar o desactivar un producto (RF-06). Se usa esta misma
  // opción de edición, enviando el estado ACTIVO o INACTIVO; los productos
  // nunca se borran de verdad. Lo pueden hacer el propietario y el vendedor.
  @Patch(':id')
  @Roles(RolCodigo.PROP, RolCodigo.VEND)
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.productoService.actualizar(id, dto, usuario);
  }

  // Ajustar el stock (HU-05). Lo pueden hacer el propietario y el vendedor;
  // siempre hay que escribir el motivo, y el cambio queda en el historial
  // (RF-11, RF-14).
  @Patch(':id/stock')
  @Roles(RolCodigo.PROP, RolCodigo.VEND)
  actualizarStock(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStockDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.productoService.actualizarStock(id, dto, usuario);
  }

  // Stock mínimo de un producto (RF-15). Solo lo puede cambiar el propietario.
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
