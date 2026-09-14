import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { RolCodigo } from '../../../common/enums/rol-codigo.enum';

export class CreateUsuarioDto {
  @IsString()
  @MaxLength(150)
  nombre: string;

  @IsEmail()
  @MaxLength(150)
  correo: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72) // bcrypt ignora lo que exceda 72 bytes
  password: string;

  // Rol que se le quiere asignar al usuario a crear. La combinación
  // permitida (quien crea -> que rol puede asignar) la valida el service.
  @IsIn([RolCodigo.PROP, RolCodigo.VEND])
  rol: RolCodigo.PROP | RolCodigo.VEND;

  // Solo lo usa un ADMIN al crear el primer PROP de una empresa.
  // Si quien llama es PROP, este campo se ignora: se usa su propia empresa (JWT).
  @IsOptional()
  @IsInt()
  @IsPositive()
  idEmpresa?: number;
}
