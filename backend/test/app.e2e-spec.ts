import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

// Estas pruebas levantan la aplicación completa, así que necesitan MySQL
// encendido y el .env configurado (igual que `npm run start:dev`).
describe('API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('AuthController', () => {
    it('/auth/login (POST) rejects invalid credentials with 401', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ correo: 'no-existe@invemoto.local', password: 'cualquiera' })
        .expect(401);
    });

    it('/auth/login (POST) rejects a malformed body with 400', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ correo: 'no-es-un-correo' })
        .expect(400);
    });
  });

  // Ninguna ruta de negocio debe responder sin un token válido.
  describe('rutas protegidas sin token', () => {
    it.each([
      ['GET', '/usuarios'],
      ['GET', '/categorias'],
      ['POST', '/categorias'],
      ['GET', '/categorias/1'],
      ['PATCH', '/categorias/1'],
      ['GET', '/productos'],
      ['POST', '/productos'],
      ['GET', '/productos/1'],
      ['PATCH', '/productos/1'],
      ['PATCH', '/productos/1/stock'],
      ['PATCH', '/productos/1/stock-minimo'],
      ['GET', '/productos/1/movimientos'],
    ])('%s %s responde 401', async (metodo, ruta) => {
      const servidor = request(app.getHttpServer());
      const llamada =
        metodo === 'GET'
          ? servidor.get(ruta)
          : metodo === 'POST'
            ? servidor.post(ruta)
            : servidor.patch(ruta);

      await llamada.expect(401);
    });

    it('rechaza un token inválido con 401', () => {
      return request(app.getHttpServer())
        .get('/productos')
        .set('Authorization', 'Bearer token-falso')
        .expect(401);
    });
  });
});
