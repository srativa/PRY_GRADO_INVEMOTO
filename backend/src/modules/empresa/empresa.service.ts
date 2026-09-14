import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmpresaEntity } from './entities/empresa.entity';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';

@Injectable()
export class EmpresaService {
  constructor(
    @InjectRepository(EmpresaEntity)
    private readonly empresaRepository: Repository<EmpresaEntity>,
  ) {}

  async crear(dto: CreateEmpresaDto): Promise<EmpresaEntity> {
    if (dto.nit) {
      await this.verificarNitDisponible(dto.nit);
    }

    const empresa = this.empresaRepository.create({
      nit: dto.nit ?? null,
      nombre: dto.nombre,
      direccion: dto.direccion ?? null,
      telefono: dto.telefono ?? null,
    });
    return this.empresaRepository.save(empresa);
  }

  async listar(): Promise<EmpresaEntity[]> {
    return this.empresaRepository.find();
  }

  async buscarPorIdOrFail(idEmpresa: number): Promise<EmpresaEntity> {
    const empresa = await this.empresaRepository.findOneBy({ idEmpresa });
    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada.');
    }
    return empresa;
  }

  async actualizar(
    idEmpresa: number,
    dto: UpdateEmpresaDto,
  ): Promise<EmpresaEntity> {
    const empresa = await this.buscarPorIdOrFail(idEmpresa);

    if (dto.nit !== undefined && dto.nit !== empresa.nit) {
      if (dto.nit) {
        await this.verificarNitDisponible(dto.nit);
      }
      empresa.nit = dto.nit;
    }
    if (dto.nombre !== undefined) empresa.nombre = dto.nombre;
    if (dto.direccion !== undefined) empresa.direccion = dto.direccion;
    if (dto.telefono !== undefined) empresa.telefono = dto.telefono;
    if (dto.estado !== undefined) empresa.estado = dto.estado;

    return this.empresaRepository.save(empresa);
  }

  private async verificarNitDisponible(nit: string): Promise<void> {
    const existente = await this.empresaRepository.findOneBy({ nit });
    if (existente) {
      throw new ConflictException(
        'Ya existe una empresa registrada con ese NIT.',
      );
    }
  }
}
