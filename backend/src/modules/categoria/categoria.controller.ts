import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolCodigo } from '../../common/enums/rol-codigo.enum';
import { CategoriaService } from './categoria.service';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';
import type { AuthenticatedUser } from '../auth/jwt-payload.interface';

@Controller('categorias')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoriaController {
  constructor(private readonly categoriaService: CategoriaService) {}

  @Post()
  @Roles(RolCodigo.PROP)
  crear(
    @Body() dto: CreateCategoriaDto,
    @CurrentUser() creador: AuthenticatedUser,
  ) {
    return this.categoriaService.crear(dto, creador);
  }

  @Get()
  @Roles(RolCodigo.PROP, RolCodigo.VEND)
  listar(@CurrentUser() usuario: AuthenticatedUser) {
    return this.categoriaService.listar(usuario);
  }

  @Get(':id')
  @Roles(RolCodigo.PROP, RolCodigo.VEND)
  buscarPorId(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.categoriaService.buscarPorIdConPermiso(id, usuario);
  }

  // Para activar o desactivar una categoría se usa esta misma opción de
  // edición, enviando el estado ACTIVO o INACTIVO. Las categorías nunca se
  // borran de verdad.
  @Patch(':id')
  @Roles(RolCodigo.PROP)
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoriaDto,
    @CurrentUser() creador: AuthenticatedUser,
  ) {
    return this.categoriaService.actualizar(id, dto, creador);
  }
}
