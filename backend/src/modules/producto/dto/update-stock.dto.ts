import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { recortarTexto } from '../../../common/transformers/recortar-texto.transformer';
import { STOCK_MAXIMO } from '../producto.constants';

// Actualizar stock (HU-05): se indica cuántas unidades hay de verdad, por
// ejemplo después de contar la mercancía. Como es un ajuste, hay que escribir
// el motivo. Queda en el historial junto con quién lo hizo (RF-11, RF-14).
export class UpdateStockDto {
  @IsInt()
  @Min(0)
  @Max(STOCK_MAXIMO)
  stockActual: number;

  @Transform(recortarTexto)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  motivo: string;
}
