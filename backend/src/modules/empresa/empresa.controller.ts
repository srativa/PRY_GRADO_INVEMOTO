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
import { RolCodigo } from '../../common/enums/rol-codigo.enum';
import { EmpresaService } from './empresa.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';

// Todo lo relacionado con empresas solo lo puede manejar el administrador de
// la plataforma.
@Controller('empresas')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolCodigo.ADMIN)
export class EmpresaController {
  constructor(private readonly empresaService: EmpresaService) {}

  @Post()
  crear(@Body() dto: CreateEmpresaDto) {
    return this.empresaService.crear(dto);
  }

  @Get()
  listar() {
    return this.empresaService.listar();
  }

  @Get(':id')
  buscarPorId(@Param('id', ParseIntPipe) id: number) {
    return this.empresaService.buscarPorIdOrFail(id);
  }

  // Para activar o desactivar una empresa se usa esta misma opción de
  // edición, enviando el estado ACTIVO o INACTIVO. Las empresas nunca se
  // borran de verdad.
  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmpresaDto,
  ) {
    return this.empresaService.actualizar(id, dto);
  }
}
