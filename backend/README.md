# INVEMOTO — Backend

API REST en NestJS + TypeORM + MySQL. El esquema de base de datos vive en
`../../Invemoto/invemoto_schema_mysql8.sql` (fuente de verdad) — este proyecto
**no** genera ni modifica tablas automáticamente (`synchronize: false`).

## Módulos implementados hasta ahora

### Auth
- `POST /auth/login` (HU-02, HU-03) — recibe `{ correo, password }`, devuelve `{ accessToken, expiresIn }`.

### Empresa (solo rol `ADMIN`, HU-01/RF-01)
- `POST /empresas` — crear una empresa cliente.
- `GET /empresas` — listar todas.
- `GET /empresas/:id`
- `PATCH /empresas/:id` — editar datos o activar/desactivar con `{ "estado": "ACTIVO" | "INACTIVO" }`. No hay `DELETE` real (ver "Por qué no hay DELETE" abajo).

### Usuario (HU-01/RF-03)
- `POST /usuarios`, `GET /usuarios`, `GET /usuarios/:id`, `PATCH /usuarios/:id`.
- Reglas de permisos (aplicadas en el backend, no solo confiadas al frontend):
  - **ADMIN** solo puede gestionar usuarios con rol `PROP`, de cualquier empresa. `GET /usuarios` requiere `?idEmpresa=` para listar los propietarios de esa empresa.
  - **PROP** solo puede gestionar usuarios con rol `VEND` de **su propia empresa** (tomada del token, nunca del body/query). `GET /usuarios` sin parámetros devuelve directamente sus vendedores.
  - **VEND** no tiene acceso a ninguna de estas rutas.

### Por qué no hay `DELETE`
"Eliminar" un usuario o una empresa siempre significa `PATCH` con `{ "estado": "INACTIVO" }`, nunca borrar la fila. Un usuario o empresa inactiva no puede volver a loguearse (`AuthService.login` ya lo valida). Esto evita romper la trazabilidad de ventas/movimientos ya registrados y coincide con el patrón que usa el resto del esquema SQL.

### Todavía no existe
Productos, inventario, ventas, devoluciones, establecimientos aliados, alertas, consultas, auditoría, reportes. Se irán agregando siguiendo el mismo patrón de carpetas: `src/modules/<dominio>/{entities,dto,*.controller,*.service,*.module}.ts`, con las entidades de TypeORM mapeadas 1:1 contra el `.sql` (nunca `synchronize: true`).

## Puesta en marcha

1. Instalar dependencias:
   ```bash
   npm install
   ```

2. Crear la base de datos ejecutando el script en tu cliente de MySQL (Workbench, CLI, etc.):
   ```
   Invemoto/invemoto_schema_mysql8.sql
   ```

3. Copiar el archivo de variables de entorno y completarlo con tus propias credenciales:
   ```bash
   cp .env.example .env
   ```
   Editá `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, y `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (la cuenta compartida del equipo con rol ADMIN). **No compartas tu `.env` real** — cada quien crea el suyo a partir de `.env.example`.

4. Crear la empresa "plataforma" y el usuario ADMIN inicial:
   ```bash
   npm run seed
   ```

5. Levantar el servidor en modo desarrollo:
   ```bash
   npm run start:dev
   ```
   Queda escuchando en `http://localhost:3000`, y se recarga solo al guardar cambios. Para pararlo: `Ctrl+C`.

   Si alguna vez el comando se queda sin mostrar los logs de arranque, probablemente quedó un proceso de Node anterior ocupando el puerto 3000 — cerrá la terminal y abrí una nueva antes de reintentar.

## Probar los endpoints

Usamos la extensión **REST Client** de VS Code con un archivo `pruebas.http` (no incluido en el repo, cada quien arma el suyo — ver `.gitignore`) para probar manualmente. Ejemplo de flujo completo:

```bash
# 1. Login con la cuenta ADMIN sembrada
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"correo":"<SEED_ADMIN_EMAIL>","password":"<SEED_ADMIN_PASSWORD>"}'
# -> { "accessToken": "...", "expiresIn": "8h" }

# 2. Crear una empresa (con el accessToken del paso anterior)
curl -X POST http://localhost:3000/empresas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN_ADMIN>" \
  -d '{"nombre":"Moto Revolución Lujos y Accesorios S.A.S","nit":"900000000-1"}'
# -> { "idEmpresa": 2, ... }

# 3. Crear el usuario Propietario de esa empresa
curl -X POST http://localhost:3000/usuarios \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN_ADMIN>" \
  -d '{"nombre":"Jaime Escobar","correo":"propietario@motorevolucion.com","password":"contrasena-segura","rol":"PROP","idEmpresa":2}'

# 4. Login como Propietario y crear un Vendedor (con SU propio token, no el de ADMIN)
curl -X POST http://localhost:3000/usuarios \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN_PROP>" \
  -d '{"nombre":"Vendedor Uno","correo":"vendedor@motorevolucion.com","password":"contrasena-segura","rol":"VEND"}'

# 5. Listar los vendedores de esa empresa (con el token del Propietario)
curl http://localhost:3000/usuarios \
  -H "Authorization: Bearer <ACCESS_TOKEN_PROP>"

# 6. Desactivar un usuario (mismo patrón para empresas, con /empresas/:id)
curl -X PATCH http://localhost:3000/usuarios/<ID_USUARIO> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN_PROP>" \
  -d '{"estado":"INACTIVO"}'
```

## Estructura del proyecto

```
src/
  main.ts                    # bootstrap: CORS, ValidationPipe global
  app.module.ts
  config/typeorm.config.ts   # conexión MySQL (synchronize: false)
  common/
    enums/rol-codigo.enum.ts # ADMIN | PROP | VEND (debe coincidir con la tabla `rol`)
    decorators/               # @Roles(), @CurrentUser()
    guards/                   # JwtAuthGuard, RolesGuard
  modules/
    rol/                      # solo lectura
    empresa/
    usuario/
    auth/
  database/seed.ts            # npm run seed
```

Cada módulo de negocio sigue el mismo patrón: `entities/` (mapeo 1:1 a la tabla SQL), `dto/` (validación de entrada con `class-validator`), `*.service.ts` (reglas de negocio y acceso a datos), `*.controller.ts` (rutas HTTP y permisos).
