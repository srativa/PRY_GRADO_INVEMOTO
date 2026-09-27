import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';

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
  precioVenta: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costo: number;

  // Con qué stock arranca el inventario del producto (RF: registrar producto
  // debe dejarlo listo para vender/contar, no en un estado intermedio sin
  // fila de inventario). Por defecto 0 si no se indica.
  @IsOptional()
  @IsInt()
  @Min(0)
  stockInicial?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stockMinimo?: number;
}
