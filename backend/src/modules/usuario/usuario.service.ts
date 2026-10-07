import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UsuarioEntity } from './entities/usuario.entity';
import { RolEntity } from '../rol/entities/rol.entity';
import { EmpresaEntity } from '../empresa/entities/empresa.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { RolCodigo } from '../../common/enums/rol-codigo.enum';
import { AuthenticatedUser } from '../auth/jwt-payload.interface';

const BCRYPT_SALT_ROUNDS = 10;

@Injectable()
export class UsuarioService {
  constructor(
    @InjectRepository(UsuarioEntity)
    private readonly usuarioRepository: Repository<UsuarioEntity>,
    @InjectRepository(RolEntity)
    private readonly rolRepository: Repository<RolEntity>,
    @InjectRepository(EmpresaEntity)
    private readonly empresaRepository: Repository<EmpresaEntity>,
  ) {}

  /**
   * Reglas para crear usuarios (RF-01, RF-03, RNF-02, RNF-03):
   * - El administrador crea propietarios en la empresa que indique.
   * - El propietario crea vendedores, siempre en su propia empresa. La
   *   empresa se toma de su sesión y no de lo que envíe, para que nadie
   *   pueda crear usuarios en un negocio ajeno.
   */
  async crear(
    dto: CreateUsuarioDto,
    creador: AuthenticatedUser,
  ): Promise<UsuarioEntity> {
    const idEmpresaDestino = this.resolverEmpresaDestino(dto, creador);

    const empresa = await this.empresaRepository.findOneBy({
      idEmpresa: idEmpresaDestino,
    });
    if (!empresa || empresa.estado !== 'ACTIVO') {
      throw new NotFoundException(
        'La empresa indicada no existe o no está activa.',
      );
    }

    const rol = await this.rolRepository.findOneBy({ codigo: dto.rol });
    if (!rol) {
      throw new NotFoundException(
        `El rol ${dto.rol} no está configurado en el sistema.`,
      );
    }

    const correoExistente = await this.usuarioRepository.findOneBy({
      correo: dto.correo,
    });
    if (correoExistente) {
      throw new ConflictException(
        'Ya existe un usuario registrado con ese correo.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    const usuario = this.usuarioRepository.create({
      idEmpresa: idEmpresaDestino,
      idRol: rol.idRol,
      nombre: dto.nombre,
      correo: dto.correo,
      passwordHash,
    });

    return this.usuarioRepository.save(usuario);
  }

  async buscarPorCorreoConRelaciones(
    correo: string,
  ): Promise<UsuarioEntity | null> {
    return this.usuarioRepository.findOne({
      where: { correo },
      relations: { rol: true, empresa: true },
    });
  }

  /**
   * Reglas para consultar y editar usuarios (las mismas que para crearlos):
   * - El administrador solo ve y edita propietarios, de cualquier empresa.
   * - El propietario solo ve y edita a los vendedores de su empresa.
   */
  async listar(
    creador: AuthenticatedUser,
    idEmpresaQuery?: number,
  ): Promise<UsuarioEntity[]> {
    if (creador.rol === RolCodigo.ADMIN) {
      if (!idEmpresaQuery) {
        throw new ForbiddenException(
          'Debes indicar idEmpresa para listar sus propietarios.',
        );
      }
      return this.usuarioRepository.find({
        where: { idEmpresa: idEmpresaQuery, rol: { codigo: RolCodigo.PROP } },
        relations: { rol: true },
      });
    }

    if (creador.rol === RolCodigo.PROP) {
      // Siempre se usa la empresa de quien consulta, aunque pida otra.
      return this.usuarioRepository.find({
        where: {
          idEmpresa: creador.idEmpresa,
          rol: { codigo: RolCodigo.VEND },
        },
        relations: { rol: true },
      });
    }

    throw new ForbiddenException(
      'Tu rol no tiene permiso para consultar usuarios.',
    );
  }

  async buscarPorIdConPermiso(
    id: number,
    creador: AuthenticatedUser,
  ): Promise<UsuarioEntity> {
    const usuario = await this.usuarioRepository.findOne({
      where: { idUsuario: id },
      relations: { rol: true, empresa: true },
    });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado.');
    }
    this.verificarPermisoSobreUsuario(usuario, creador);
    return usuario;
  }

  async actualizar(
    id: number,
    dto: UpdateUsuarioDto,
    creador: AuthenticatedUser,
  ): Promise<UsuarioEntity> {
    const usuario = await this.buscarPorIdConPermiso(id, creador);

    if (dto.correo && dto.correo !== usuario.correo) {
      const correoExistente = await this.usuarioRepository.findOneBy({
        correo: dto.correo,
      });
      if (correoExistente) {
        throw new ConflictException(
          'Ya existe un usuario registrado con ese correo.',
        );
      }
      usuario.correo = dto.correo;
    }

    if (dto.nombre) {
      usuario.nombre = dto.nombre;
    }

    if (dto.estado) {
      usuario.estado = dto.estado;
    }

    return this.usuarioRepository.save(usuario);
  }

  // La misma regla de crear (administrador con propietarios, propietario con
  // vendedores) se usa para listar, ver el detalle y editar.
  private verificarPermisoSobreUsuario(
    target: UsuarioEntity,
    creador: AuthenticatedUser,
  ): void {
    if (creador.rol === RolCodigo.ADMIN) {
      if (target.rol.codigo !== RolCodigo.PROP) {
        throw new ForbiddenException(
          'Un ADMIN solo puede gestionar usuarios con rol PROP.',
        );
      }
      return;
    }

    if (creador.rol === RolCodigo.PROP) {
      // Si alguien pide un usuario de otra empresa, el sistema responde como
      // si no existiera. Así nadie puede averiguar qué datos tienen los demás
      // negocios.
      if (target.idEmpresa !== creador.idEmpresa) {
        throw new NotFoundException('Usuario no encontrado.');
      }
      if (target.rol.codigo !== RolCodigo.VEND) {
        throw new ForbiddenException(
          'Un PROP solo puede gestionar vendedores de su propia empresa.',
        );
      }
      return;
    }

    throw new ForbiddenException(
      'Tu rol no tiene permiso para gestionar usuarios.',
    );
  }

  private resolverEmpresaDestino(
    dto: CreateUsuarioDto,
    creador: AuthenticatedUser,
  ): number {
    if (creador.rol === RolCodigo.ADMIN) {
      if (dto.rol !== RolCodigo.PROP) {
        throw new ForbiddenException(
          'Un ADMIN solo puede crear usuarios con rol PROP.',
        );
      }
      if (!dto.idEmpresa) {
        throw new ForbiddenException(
          'Debes indicar idEmpresa al crear un usuario PROP.',
        );
      }
      return dto.idEmpresa;
    }

    if (creador.rol === RolCodigo.PROP) {
      if (dto.rol !== RolCodigo.VEND) {
        throw new ForbiddenException(
          'Un PROP solo puede crear usuarios con rol VEND.',
        );
      }
      // Cada negocio solo ve lo suyo: si se envía otra empresa, se ignora.
      return creador.idEmpresa;
    }

    throw new ForbiddenException(
      'Tu rol no tiene permiso para registrar usuarios.',
    );
  }
}
