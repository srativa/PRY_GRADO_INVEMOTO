import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
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

  afterEach(async () => {
    await app.close();
  });
});
