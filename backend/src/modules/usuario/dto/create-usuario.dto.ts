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
  @MaxLength(72) // si es más larga, el resto no se tendría en cuenta
  password: string;

  // Rol que tendrá el nuevo usuario. Más adelante se revisa si quien lo crea
  // tiene permiso para darle ese rol.
  @IsIn([RolCodigo.PROP, RolCodigo.VEND])
  rol: RolCodigo.PROP | RolCodigo.VEND;

  // Solo lo usa el administrador cuando crea el primer propietario de una
  // empresa. Si quien crea es un propietario, este dato no se tiene en
  // cuenta: el nuevo usuario queda siempre en su propia empresa.
  @IsOptional()
  @IsInt()
  @IsPositive()
  idEmpresa?: number;
}
