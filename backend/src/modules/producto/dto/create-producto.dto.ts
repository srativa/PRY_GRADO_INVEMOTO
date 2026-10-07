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

  // Con cuántas unidades empieza el producto. Si no se indica, empieza en 0.
  // Si empieza con unidades, eso queda anotado en el historial.
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(STOCK_MAXIMO)
  stockInicial?: number;

  // Solo el propietario puede fijar este valor. Si un vendedor lo envía, el
  // sistema lo rechaza.
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(STOCK_MAXIMO)
  stockMinimo?: number;
}
