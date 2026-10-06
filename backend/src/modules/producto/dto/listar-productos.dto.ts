import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { recortarTexto } from '../../../common/transformers/recortar-texto.transformer';

// Estados de disponibilidad (RF-08). Los filtros no son excluyentes entre sí:
// un producto con stock 2 y mínimo 5 es a la vez DISPONIBLE y BAJO_STOCK.
export enum DisponibilidadProducto {
  DISPONIBLE = 'DISPONIBLE', // stock mayor a 0
  AGOTADO = 'AGOTADO', // stock igual a 0
  BAJO_STOCK = 'BAJO_STOCK', // stock menor o igual al mínimo configurado (RF-16)
}

// Filtros de GET /productos (RF-08). Todos son opcionales y se pueden combinar.
export class ListarProductosQueryDto {
  @IsOptional()
  @Transform(recortarTexto)
  @IsString()
  @MaxLength(150)
  nombre?: string;

  @IsOptional()
  @Transform(recortarTexto)
  @IsString()
  @MaxLength(50)
  codigo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  idCategoria?: number;

  @IsOptional()
  @IsIn(['ACTIVO', 'INACTIVO'])
  estado?: 'ACTIVO' | 'INACTIVO';

  @IsOptional()
  @IsEnum(DisponibilidadProducto)
  disponibilidad?: DisponibilidadProducto;
}
