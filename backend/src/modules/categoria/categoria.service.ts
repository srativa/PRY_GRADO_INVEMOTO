import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoriaEntity } from './entities/categoria.entity';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';
import { AuthenticatedUser } from '../auth/jwt-payload.interface';

@Injectable()
export class CategoriaService {
  constructor(
    @InjectRepository(CategoriaEntity)
    private readonly categoriaRepository: Repository<CategoriaEntity>,
  ) {}

  // Solo el propietario puede organizar las categorías de su negocio (RF-05).
  async crear(
    dto: CreateCategoriaDto,
    creador: AuthenticatedUser,
  ): Promise<CategoriaEntity> {
    await this.verificarNombreDisponible(creador.idEmpresa, dto.nombre);

    const categoria = this.categoriaRepository.create({
      idEmpresa: creador.idEmpresa,
      nombre: dto.nombre,
      descripcion: dto.descripcion ?? null,
    });
    return this.categoriaRepository.save(categoria);
  }

  // El propietario y el vendedor pueden ver las categorías de su propia
  // empresa, por ejemplo para elegir una al registrar un producto.
  async listar(usuario: AuthenticatedUser): Promise<CategoriaEntity[]> {
    return this.categoriaRepository.find({
      where: { idEmpresa: usuario.idEmpresa },
    });
  }

  // Si alguien pide una categoría de otra empresa, el sistema responde como
  // si no existiera. Así nadie puede averiguar qué datos tienen los demás
  // negocios.
  async buscarPorIdConPermiso(
    id: number,
    usuario: AuthenticatedUser,
  ): Promise<CategoriaEntity> {
    const categoria = await this.categoriaRepository.findOneBy({
      idCategoria: id,
      idEmpresa: usuario.idEmpresa,
    });
    if (!categoria) {
      throw new NotFoundException('Categoría no encontrada.');
    }
    return categoria;
  }

  async actualizar(
    id: number,
    dto: UpdateCategoriaDto,
    creador: AuthenticatedUser,
  ): Promise<CategoriaEntity> {
    const categoria = await this.buscarPorIdConPermiso(id, creador);

    if (dto.nombre !== undefined && dto.nombre !== categoria.nombre) {
      await this.verificarNombreDisponible(creador.idEmpresa, dto.nombre, id);
      categoria.nombre = dto.nombre;
    }
    if (dto.descripcion !== undefined) categoria.descripcion = dto.descripcion;
    if (dto.estado !== undefined) categoria.estado = dto.estado;

    return this.categoriaRepository.save(categoria);
  }

  private async verificarNombreDisponible(
    idEmpresa: number,
    nombre: string,
    idCategoriaExcluida?: number,
  ): Promise<void> {
    const existente = await this.categoriaRepository.findOneBy({
      idEmpresa,
      nombre,
    });
    if (existente && existente.idCategoria !== idCategoriaExcluida) {
      throw new ConflictException(
        'Ya existe una categoría con ese nombre en tu empresa.',
      );
    }
  }
}
