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
import { UsuarioService } from './usuario.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import type { AuthenticatedUser } from '../auth/jwt-payload.interface';
import { UsuarioEntity } from './entities/usuario.entity';

@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolCodigo.ADMIN, RolCodigo.PROP)
export class UsuarioController {
  constructor(private readonly usuarioService: UsuarioService) {}

  // Registro de usuario (HU-01). El administrador crea propietarios y el
  // propietario crea vendedores; esa regla se revisa más adelante.
  @Post()
  async crear(
    @Body() dto: CreateUsuarioDto,
    @CurrentUser() creador: AuthenticatedUser,
  ) {
    const usuario = await this.usuarioService.crear(dto, creador);
    return this.aRespuesta(usuario);
  }

  // Consultar usuarios (RF-03). El administrador ve los propietarios de la
  // empresa que elija. El propietario siempre ve solo a sus vendedores,
  // aunque pida otra empresa.
  @Get()
  async listar(
    @CurrentUser() creador: AuthenticatedUser,
    @Query('idEmpresa') idEmpresaRaw?: string,
  ) {
    const idEmpresa = idEmpresaRaw ? parseInt(idEmpresaRaw, 10) : undefined;
    if (idEmpresaRaw && Number.isNaN(idEmpresa)) {
      throw new BadRequestException('idEmpresa debe ser un número.');
    }
    const usuarios = await this.usuarioService.listar(creador, idEmpresa);
    return usuarios.map((u) => this.aRespuesta(u));
  }

  @Get(':id')
  async buscarPorId(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() creador: AuthenticatedUser,
  ) {
    const usuario = await this.usuarioService.buscarPorIdConPermiso(
      id,
      creador,
    );
    return this.aRespuesta(usuario);
  }

  // Para activar o desactivar un usuario se usa esta misma opción de edición,
  // enviando el estado ACTIVO o INACTIVO. Los usuarios nunca se borran de
  // verdad (RF-03).
  @Patch(':id')
  async actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUsuarioDto,
    @CurrentUser() creador: AuthenticatedUser,
  ) {
    const usuario = await this.usuarioService.actualizar(id, dto, creador);
    return this.aRespuesta(usuario);
  }

  // La contraseña guardada nunca se devuelve en ninguna respuesta.
  private aRespuesta(usuario: UsuarioEntity) {
    return {
      idUsuario: usuario.idUsuario,
      idEmpresa: usuario.idEmpresa,
      nombre: usuario.nombre,
      correo: usuario.correo,
      estado: usuario.estado,
    };
  }
}
