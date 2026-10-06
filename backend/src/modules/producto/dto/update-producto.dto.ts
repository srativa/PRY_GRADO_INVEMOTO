import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PRECIO_MAXIMO } from '../producto.constants';

export class UpdateProductoDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  idCategoria?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  codigoProducto?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  presentacion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  descripcion?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(PRECIO_MAXIMO)
  precioVenta?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(PRECIO_MAXIMO)
  costo?: number;

  @IsOptional()
  @IsIn(['ACTIVO', 'INACTIVO'])
  estado?: 'ACTIVO' | 'INACTIVO';
}
