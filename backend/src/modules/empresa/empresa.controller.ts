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

// Todo el módulo empresa es exclusivo del ADMIN (dueños de la plataforma).
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

  // RF: activar/desactivar una empresa es este mismo endpoint con
  // { "estado": "INACTIVO" } o { "estado": "ACTIVO" } — no hay DELETE real.
  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmpresaDto,
  ) {
    return this.empresaService.actualizar(id, dto);
  }
}
