import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmpresaEntity } from './entities/empresa.entity';
import { EmpresaService } from './empresa.service';
import { EmpresaController } from './empresa.controller';

@Module({
  imports: [TypeOrmModule.forFeature([EmpresaEntity])],
  controllers: [EmpresaController],
  providers: [EmpresaService],
  exports: [EmpresaService, TypeOrmModule],
})
export class EmpresaModule {}
