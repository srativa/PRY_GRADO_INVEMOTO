import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PRECIO_MAXIMO, STOCK_MAXIMO } from '../producto.constants';

export class CreateProductoDto {
  @IsInt()
  @IsPositive()
  idCategoria: number;

  @IsString()
  @MaxLength(50)
  codigoProducto: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  presentacion?: string;

  @IsString()
  @MaxLength(150)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  descripcion?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(PRECIO_MAXIMO)
  precioVenta: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(PRECIO_MAXIMO)
  costo: number;

  // Con qué stock arranca el inventario del producto. Por defecto 0. Si es
  // mayor a 0 queda registrado en el historial de movimientos.
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(STOCK_MAXIMO)
  stockInicial?: number;

  // Solo el propietario puede definirlo (el service rechaza a un vendedor que
  // lo envíe).
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(STOCK_MAXIMO)
  stockMinimo?: number;
}
