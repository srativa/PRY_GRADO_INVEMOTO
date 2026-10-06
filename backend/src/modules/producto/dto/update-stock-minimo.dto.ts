import { IsInt, Max, Min } from 'class-validator';
import { STOCK_MAXIMO } from '../producto.constants';

// RF-15: solo el propietario establece el umbral de bajo stock de un producto.
export class UpdateStockMinimoDto {
  @IsInt()
  @Min(0)
  @Max(STOCK_MAXIMO)
  stockMinimo: number;
}
