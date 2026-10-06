# INVEMOTO — Backend

El servidor de INVEMOTO. Gestiona el inventario y los productos de varios negocios,
cada uno aislado de los demás. Está hecho con NestJS, TypeORM y MySQL 8.

> Hoy es solo el servidor (API). Las apps web y móvil usarán estas mismas rutas.
> Para ver el proyecto completo y levantarlo con Docker, consulta el
> [README de la raíz](../README.md).

## Qué puede hacer

El sistema tiene tres tipos de usuario:

- **ADMIN**: el equipo INVEMOTO. Da de alta los negocios y a sus propietarios.
- **Propietario (PROP)**: el dueño de un negocio. Maneja su equipo, su catálogo
  y su inventario.
- **Vendedor (VEND)**: el empleado. Consulta y mantiene el inventario.

| Acción | ADMIN | PROP | VEND |
|---|:-:|:-:|:-:|
| Crear y gestionar negocios | Sí | | |
| Gestionar usuarios | Solo propietarios | Solo sus vendedores | |
| Crear y editar categorías | | Sí | |
| Ver categorías | | Sí | Sí |
| Crear, editar, activar y desactivar productos | | Sí | Sí |
| Consultar y buscar productos (con costo) | | Sí | Sí |
| Ajustar el stock | | Sí | Sí |
| Definir el stock mínimo | | Sí | |
| Ver el historial de movimientos | | Sí | |

### Lo que conviene saber

- **Cada negocio ve solo lo suyo.** Si alguien pide algo de otro negocio, recibe
  "no encontrado", igual que si no existiera.
- **Nada se borra.** "Eliminar" es desactivar (`"estado": "INACTIVO"`), para no
  perder el rastro de lo ya registrado. Un usuario o negocio desactivado no puede
  iniciar sesión (si ya tenía una sesión abierta, termina cuando vence el token).
- **Todo ajuste de stock deja huella.** Se guarda cuánto cambió, el motivo, quién
  lo hizo y cuándo. El stock inicial de un producto también queda registrado.
- **Hay topes.** Precio y costo: hasta $100.000.000 con 2 decimales. Stock: hasta
  1.000.000 unidades.

## Puesta en marcha (sin Docker)

Necesitas Node.js 20 o superior y MySQL 8.

1. Instala las dependencias:
   ```bash
   npm install
   ```
2. Crea la base de datos ejecutando `../database/init/invemoto_schema_mysql8.sql`
   en tu cliente de MySQL.
3. Crea tu archivo de configuración y complétalo (usuario y contraseña de MySQL,
   un `JWT_SECRET` propio y la cuenta ADMIN inicial). **No compartas tu `.env`.**
   ```bash
   cp .env.example .env
   ```
4. Crea la empresa de la plataforma y la cuenta ADMIN:
   ```bash
   npm run seed
   ```
5. Enciende el servidor en `http://localhost:3000`:
   ```bash
   npm run start:dev
   ```

## Primer recorrido

Todas las rutas, salvo el login, necesitan `Authorization: Bearer <token>`.

**1. Iniciar sesión** (el token dura 8 horas):
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"correo":"propietario@motorevolucion.com","password":"ClaveSegura123"}'
```

**2. Registrar un producto** (con 5 unidades iniciales):
```bash
curl -X POST http://localhost:3000/productos \
  -H "Content-Type: application/json" -H "Authorization: Bearer <TOKEN>" \
  -d '{"idCategoria":1,"codigoProducto":"CASCO-001","nombre":"Casco integral M",
       "precioVenta":250000,"costo":160000,"stockInicial":5,"stockMinimo":2}'
```

**3. Buscar** cascos activos con poco stock:
```bash
curl "http://localhost:3000/productos?nombre=casco&estado=ACTIVO&disponibilidad=BAJO_STOCK" \
  -H "Authorization: Bearer <TOKEN>"
```

**4. Ajustar el stock** tras un conteo físico (indica el stock real y el motivo):
```bash
curl -X PATCH http://localhost:3000/productos/1/stock \
  -H "Content-Type: application/json" -H "Authorization: Bearer <TOKEN>" \
  -d '{"stockActual":4,"motivo":"Conteo físico del sábado"}'
```

**5. Ver el historial** (solo propietario):
```bash
curl http://localhost:3000/productos/1/movimientos \
  -H "Authorization: Bearer <TOKEN>"
```

Para probar todo el sistema con calma, copia `pruebas.http.example` como
`pruebas.http` (está en `.gitignore`) y úsalo con la extensión REST Client de VS Code.

## Rutas

| Método y ruta | Quién | Para qué |
|---|---|---|
| `POST /auth/login` | Todos | Iniciar sesión |
| `POST /empresas` · `GET /empresas` | ADMIN | Crear y listar negocios |
| `GET /empresas/:id` · `PATCH /empresas/:id` | ADMIN | Ver, editar, activar o desactivar |
| `POST /usuarios` · `GET /usuarios` | ADMIN, PROP | Crear y listar usuarios |
| `GET /usuarios/:id` · `PATCH /usuarios/:id` | ADMIN, PROP | Ver, editar, activar o desactivar |
| `POST /categorias` · `PATCH /categorias/:id` | PROP | Crear y editar categorías |
| `GET /categorias` · `GET /categorias/:id` | PROP, VEND | Consultar categorías |
| `POST /productos` | PROP, VEND | Registrar un producto |
| `GET /productos` | PROP, VEND | Listar y buscar (ver filtros) |
| `GET /productos/:id` · `PATCH /productos/:id` | PROP, VEND | Ver, editar, activar o desactivar |
| `PATCH /productos/:id/stock` | PROP, VEND | Ajustar el stock (con motivo) |
| `PATCH /productos/:id/stock-minimo` | PROP | Definir el stock mínimo |
| `GET /productos/:id/movimientos` | PROP | Historial de movimientos |

**Filtros de `GET /productos`** (opcionales y combinables):
`nombre`, `codigo` (contienen el texto), `idCategoria`, `estado`
(`ACTIVO` o `INACTIVO`) y `disponibilidad`: `DISPONIBLE` (hay stock), `AGOTADO`
(stock en cero) o `BAJO_STOCK` (stock menor o igual al mínimo).

## Si algo falla

| Código | Significa |
|---|---|
| 400 | Datos inválidos: falta un campo, un valor es incorrecto o supera un tope |
| 401 | No hay sesión: falta el token, es inválido o venció |
| 403 | Tu rol no tiene permiso para esa acción |
| 404 | No existe, o pertenece a otro negocio |
| 409 | Ya existe: NIT, correo, código de producto o nombre de categoría repetido |

## Pruebas

| Comando | Qué hace | Necesita MySQL |
|---|---|:-:|
| `npm test` | Pruebas unitarias | No |
| `npm run test:e2e` | Pruebas de la API completa | Sí |
| `npm run build` | Compila | No |
| `npm run lint` | Revisa y corrige el formato | No |

Si `npm test` se corta con un aviso de `watchman`, usa `npx jest --watchman=false`.

## Estructura

```
src/
  common/      roles, guards, decoradores y utilidades compartidas
  config/      conexión a MySQL
  database/    seed de la cuenta ADMIN
  modules/     auth · empresa · usuario · categoria · producto
test/          pruebas e2e
```

Cada módulo sigue el mismo patrón: `entities/` (tablas), `dto/` (validación de
entrada), `*.service.ts` (reglas de negocio), `*.controller.ts` (rutas y permisos)
y `*.spec.ts` (pruebas).

## Qué falta

Ingreso de mercancía y proveedores, ventas, devoluciones, consulta entre negocios
aliados, alertas, predicción de abastecimiento y reportes.
