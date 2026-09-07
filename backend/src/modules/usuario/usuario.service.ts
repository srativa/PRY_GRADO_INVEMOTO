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
   * Reglas de creación (RF-01/RF-03, RNF-02, RNF-03):
   * - ADMIN crea usuarios con rol PROP, para la empresa que indique en el body.
   * - PROP crea usuarios con rol VEND, siempre dentro de su propia empresa
   *   (id_empresa se toma del JWT, nunca del body, para no permitir que un
   *   propietario cree usuarios en otra empresa).
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
   * Reglas de consulta/edición (mismo espíritu que resolverEmpresaDestino):
   * - ADMIN solo ve/edita usuarios con rol PROP (de cualquier empresa).
   * - PROP solo ve/edita usuarios con rol VEND de su propia empresa.
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
      // Se ignora cualquier idEmpresa recibido por query: siempre la propia.
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

  // Misma regla ADMIN<->PROP / PROP<->VEND usada al crear, reutilizada para
  // listar, ver el detalle y editar.
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
      if (
        target.rol.codigo !== RolCodigo.VEND ||
        target.idEmpresa !== creador.idEmpresa
      ) {
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
      // Aislamiento multi-tenant: se ignora cualquier idEmpresa recibido en el body.
      return creador.idEmpresa;
    }

    throw new ForbiddenException(
      'Tu rol no tiene permiso para registrar usuarios.',
    );
  }
}
