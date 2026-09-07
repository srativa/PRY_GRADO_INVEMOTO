import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateEmpresaDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  nit?: string;

  @IsString()
  @MaxLength(150)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  direccion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefono?: string;
}
