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

// HU-05 Actualizar stock: el usuario corrige el valor absoluto del stock (p. ej.
// tras un conteo físico). Es un ajuste, así que el motivo es obligatorio: queda
// guardado en el historial junto con el usuario que lo hizo (RF-11, RF-14).
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
