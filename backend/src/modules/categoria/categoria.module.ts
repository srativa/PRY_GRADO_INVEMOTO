import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriaEntity } from './entities/categoria.entity';
import { CategoriaService } from './categoria.service';
import { CategoriaController } from './categoria.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CategoriaEntity])],
  controllers: [CategoriaController],
  providers: [CategoriaService],
  exports: [CategoriaService, TypeOrmModule],
})
export class CategoriaModule {}
