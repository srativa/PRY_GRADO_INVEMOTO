import { IsInt, IsOptional, Min } from 'class-validator';

// HU-05 Actualizar stock: el usuario corrige el valor absoluto del stock
// (p. ej. tras un conteo físico) y opcionalmente el umbral de bajo stock.
// El service exige que venga al menos uno de los dos campos.
export class UpdateStockDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  stockActual?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stockMinimo?: number;
}
