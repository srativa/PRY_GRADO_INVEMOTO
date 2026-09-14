import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolEntity } from './entities/rol.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RolEntity])],
  exports: [TypeOrmModule],
})
export class RolModule {}
