import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductoEntity } from './entities/producto.entity';
import { InventarioEntity } from './entities/inventario.entity';
import { CategoriaEntity } from '../categoria/entities/categoria.entity';
import { ProductoService } from './producto.service';
import { ProductoController } from './producto.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductoEntity,
      InventarioEntity,
      CategoriaEntity,
    ]),
  ],
  controllers: [ProductoController],
  providers: [ProductoService],
  exports: [ProductoService, TypeOrmModule],
})
export class ProductoModule {}
