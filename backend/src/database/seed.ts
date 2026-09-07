// Script de arranque (no forma parte de la app en runtime).
// Uso: npm run seed
// Crea, si no existen, la empresa "INVEMOTO Plataforma" y el usuario ADMIN
// compartido por el equipo (correo/contraseña vienen de .env, nunca hardcodeados).
import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { RolEntity } from '../modules/rol/entities/rol.entity';
import { EmpresaEntity } from '../modules/empresa/entities/empresa.entity';
import { UsuarioEntity } from '../modules/usuario/entities/usuario.entity';
import { RolCodigo } from '../common/enums/rol-codigo.enum';

loadEnv();

const PLATAFORMA_NOMBRE = 'INVEMOTO Plataforma';
const BCRYPT_SALT_ROUNDS = 10;

async function run() {
  const requiredEnv = [
    'DB_HOST',
    'DB_PORT',
    'DB_USER',
    'DB_NAME',
    'SEED_ADMIN_EMAIL',
    'SEED_ADMIN_PASSWORD',
  ];
  for (const key of requiredEnv) {
    if (!process.env[key]) {
      throw new Error(
        `Falta la variable de entorno ${key} (revisa tu archivo .env).`,
      );
    }
  }

  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME,
    entities: [RolEntity, EmpresaEntity, UsuarioEntity],
    synchronize: false,
  });

  await dataSource.initialize();

  try {
    const rolRepo = dataSource.getRepository(RolEntity);
    const empresaRepo = dataSource.getRepository(EmpresaEntity);
    const usuarioRepo = dataSource.getRepository(UsuarioEntity);

    const rolAdmin = await rolRepo.findOneBy({ codigo: RolCodigo.ADMIN });
    if (!rolAdmin) {
      throw new Error(
        `No existe el rol ${RolCodigo.ADMIN} en la tabla rol. ` +
          'Verifica que invemoto_schema_mysql8.sql se haya ejecutado completo (incluye los INSERT de seed).',
      );
    }

    let empresaPlataforma = await empresaRepo.findOneBy({
      nombre: PLATAFORMA_NOMBRE,
    });
    if (!empresaPlataforma) {
      empresaPlataforma = await empresaRepo.save(
        empresaRepo.create({
          nombre: PLATAFORMA_NOMBRE,
          nit: null,
          direccion: null,
          telefono: null,
        }),
      );
      console.log(
        `Empresa "${PLATAFORMA_NOMBRE}" creada (id_empresa=${empresaPlataforma.idEmpresa}).`,
      );
    } else {
      console.log(
        `Empresa "${PLATAFORMA_NOMBRE}" ya existía (id_empresa=${empresaPlataforma.idEmpresa}).`,
      );
    }

    const correoAdmin = process.env.SEED_ADMIN_EMAIL!;
    const usuarioAdminExistente = await usuarioRepo.findOneBy({
      correo: correoAdmin,
    });
    if (usuarioAdminExistente) {
      console.log(
        `El usuario ADMIN (${correoAdmin}) ya existía. No se hace nada más.`,
      );
      return;
    }

    const passwordHash = await bcrypt.hash(
      process.env.SEED_ADMIN_PASSWORD!,
      BCRYPT_SALT_ROUNDS,
    );
    const usuarioAdmin = await usuarioRepo.save(
      usuarioRepo.create({
        idEmpresa: empresaPlataforma.idEmpresa,
        idRol: rolAdmin.idRol,
        nombre: 'Equipo INVEMOTO',
        correo: correoAdmin,
        passwordHash,
      }),
    );
    console.log(
      `Usuario ADMIN creado (id_usuario=${usuarioAdmin.idUsuario}, correo=${correoAdmin}).`,
    );
  } finally {
    await dataSource.destroy();
  }
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : error;
  console.error('Fallo el seed inicial:', message);
  process.exit(1);
});
