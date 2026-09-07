import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsuarioEntity } from './entities/usuario.entity';
import { RolEntity } from '../rol/entities/rol.entity';
import { EmpresaEntity } from '../empresa/entities/empresa.entity';
import { UsuarioService } from './usuario.service';
import { UsuarioController } from './usuario.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([UsuarioEntity, RolEntity, EmpresaEntity]),
  ],
  controllers: [UsuarioController],
  providers: [UsuarioService],
  exports: [UsuarioService, TypeOrmModule],
})
export class UsuarioModule {}
