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

// Formas de filtrar según cuántas unidades quedan (RF-08). Un producto puede
// estar en más de una: si tiene 2 unidades y su mínimo es 5, está
// disponible y también bajo de stock.
export enum DisponibilidadProducto {
  DISPONIBLE = 'DISPONIBLE', // hay al menos una unidad
  AGOTADO = 'AGOTADO', // no queda ninguna unidad
  BAJO_STOCK = 'BAJO_STOCK', // quedan tantas unidades como el mínimo, o menos (RF-16)
}

// Filtros para buscar productos (RF-08). Ninguno es obligatorio y se pueden
// usar varios a la vez.
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
