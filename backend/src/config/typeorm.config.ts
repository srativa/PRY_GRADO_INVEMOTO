import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { RolEntity } from '../modules/rol/entities/rol.entity';
import { EmpresaEntity } from '../modules/empresa/entities/empresa.entity';
import { UsuarioEntity } from '../modules/usuario/entities/usuario.entity';
import { CategoriaEntity } from '../modules/categoria/entities/categoria.entity';
import { ProductoEntity } from '../modules/producto/entities/producto.entity';
import { InventarioEntity } from '../modules/producto/entities/inventario.entity';
import { MovimientoInventarioEntity } from '../modules/producto/entities/movimiento-inventario.entity';

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
    entities: [
      RolEntity,
      EmpresaEntity,
      UsuarioEntity,
      CategoriaEntity,
      ProductoEntity,
      InventarioEntity,
      MovimientoInventarioEntity,
    ],
    // Las tablas ya están definidas en el script SQL del proyecto, y ese
    // script es el que manda. El sistema nunca debe crear ni modificar tablas
    // por su cuenta.
    synchronize: false,
  };
}
