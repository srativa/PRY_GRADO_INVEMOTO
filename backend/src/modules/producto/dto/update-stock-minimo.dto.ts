import { IsInt, Max, Min } from 'class-validator';
import { STOCK_MAXIMO } from '../producto.constants';

// Solo el propietario fija la cantidad mínima a partir de la cual el sistema
// avisa que queda poco de un producto (RF-15).
export class UpdateStockMinimoDto {
  @IsInt()
  @Min(0)
  @Max(STOCK_MAXIMO)
  stockMinimo: number;
}
