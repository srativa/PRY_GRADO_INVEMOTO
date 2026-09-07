import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { RolEntity } from '../modules/rol/entities/rol.entity';
import { EmpresaEntity } from '../modules/empresa/entities/empresa.entity';
import { UsuarioEntity } from '../modules/usuario/entities/usuario.entity';

export function buildTypeOrmOptions(
  config: ConfigService,
): TypeOrmModuleOptions {
  return {
    type: 'mysql',
    host: config.get<string>('DB_HOST', 'localhost'),
    port: config.get<number>('DB_PORT', 3306),
    username: config.get<string>('DB_USER', 'root'),
    password: config.get<string>('DB_PASSWORD', ''),
    database: config.get<string>('DB_NAME', 'invemoto'),
    entities: [RolEntity, EmpresaEntity, UsuarioEntity],
    // El esquema ya existe en invemoto_schema_mysql8.sql (fuente de verdad).
    // TypeORM nunca debe generar ni alterar tablas automaticamente.
    synchronize: false,
  };
}
