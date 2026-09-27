import {
  BadRequestException,
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
import type { AuthenticatedUser } from '../auth/jwt-payload.interface';

@Controller('productos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductoController {
  constructor(private readonly productoService: ProductoService) {}

  // HU-04 Registrar producto — solo el propietario define el catálogo.
  @Post()
  @Roles(RolCodigo.PROP)
  crear(
    @Body() dto: CreateProductoDto,
    @CurrentUser() creador: AuthenticatedUser,
  ) {
    return this.productoService.crear(dto, creador);
  }

  // HU-06 Consultar inventario — PROP y VEND, con filtro opcional por categoría.
  @Get()
  @Roles(RolCodigo.PROP, RolCodigo.VEND)
  listar(
    @CurrentUser() usuario: AuthenticatedUser,
    @Query('idCategoria') idCategoriaRaw?: string,
  ) {
    const idCategoria = idCategoriaRaw
      ? parseInt(idCategoriaRaw, 10)
      : undefined;
    if (idCategoriaRaw && Number.isNaN(idCategoria)) {
      throw new BadRequestException('idCategoria debe ser un número.');
    }
    return this.productoService.listar(usuario, idCategoria);
  }

  @Get(':id')
  @Roles(RolCodigo.PROP, RolCodigo.VEND)
  buscarPorId(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.productoService.buscarPorIdConPermiso(id, usuario);
  }

  // RF: activar/desactivar un producto se hace con este mismo endpoint
  // mandando { "estado": "INACTIVO" } o { "estado": "ACTIVO" } — no hay DELETE real.
  @Patch(':id')
  @Roles(RolCodigo.PROP)
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductoDto,
    @CurrentUser() creador: AuthenticatedUser,
  ) {
    return this.productoService.actualizar(id, dto, creador);
  }

  // HU-05 Actualizar stock — PROP y VEND (el vendedor corrige el conteo
  // desde el punto de venta cuando lo detecta).
  @Patch(':id/stock')
  @Roles(RolCodigo.PROP, RolCodigo.VEND)
  actualizarStock(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStockDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.productoService.actualizarStock(id, dto, usuario);
  }
}
