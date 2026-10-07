# Backend de INVEMOTO

Este es el servidor de INVEMOTO. Aquí se guarda la información de cada negocio y se
revisa quién puede hacer qué. Cada negocio solo ve lo suyo. Está hecho con NestJS,
TypeORM y MySQL 8.

Por ahora solo existe el servidor; la aplicación web y la móvil lo van a usar más
adelante. Para ver el proyecto completo o encenderlo con Docker, mira el
[README de la raíz](../README.md).

## Quién puede hacer qué

Hay tres tipos de usuario:

- **Administrador (ADMIN):** el equipo de INVEMOTO. Registra los negocios y a sus
  dueños.
- **Propietario (PROP):** el dueño del negocio. Maneja a sus vendedores, sus
  categorías y su inventario.
- **Vendedor (VEND):** el empleado del negocio. Registra productos, los consulta y
  ajusta el stock.

| Qué se puede hacer | Administrador | Propietario | Vendedor |
|---|:-:|:-:|:-:|
| Registrar y manejar negocios | Sí | | |
| Manejar usuarios | Solo propietarios | Solo sus vendedores | |
| Crear y editar categorías | | Sí | |
| Ver categorías | | Sí | Sí |
| Registrar, editar, activar y desactivar productos | | Sí | Sí |
| Buscar productos (con su costo) | | Sí | Sí |
| Ajustar el stock | | Sí | Sí |
| Cambiar el stock mínimo | | Sí | |
| Ver el historial de movimientos | | Sí | |

## Reglas importantes

- **Cada negocio solo ve su propia información.** Si alguien pide algo de otro
  negocio, el sistema responde que no existe.
- **No se borra nada.** Para "eliminar" algo se desactiva (`"estado": "INACTIVO"`),
  así no se pierde lo que ya se registró. Un usuario o un negocio desactivado ya no
  puede iniciar sesión; si tenía la sesión abierta, le dura hasta que se le venza.
- **Cada cambio de stock queda anotado:** cuánto cambió, por qué, quién lo hizo y
  cuándo. Las unidades con las que se registra un producto también quedan anotadas.
- **Hay límites para evitar errores al digitar:** el precio y el costo pueden
  llegar hasta $100.000.000 y el stock hasta 1.000.000 unidades.

## Cómo encenderlo sin Docker

Necesitas Node.js 20 o más reciente y MySQL 8.

1. Instala lo necesario:
   ```bash
   npm install
   ```
2. Crea la base de datos corriendo el script
   `../database/init/invemoto_schema_mysql8.sql` en Workbench o en el programa de
   MySQL que uses.
3. Copia `.env.example` como `.env` y llénalo con tu usuario y contraseña de MySQL,
   una clave tuya para `JWT_SECRET` y los datos de la cuenta de administrador.
   **No compartas este archivo.**
   ```bash
   cp .env.example .env
   ```
4. Crea la cuenta de administrador:
   ```bash
   npm run seed
   ```
5. Enciende el servidor. Queda en `http://localhost:3000`:
   ```bash
   npm run start:dev
   ```

## Para probarlo

Al iniciar sesión el sistema te da un token, que dura 8 horas. Todas las demás
rutas lo piden en el encabezado `Authorization: Bearer <token>`.

**1. Iniciar sesión:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"correo":"propietario@motorevolucion.com","password":"ClaveSegura123"}'
```

**2. Registrar un producto** que empieza con 5 unidades:
```bash
curl -X POST http://localhost:3000/productos \
  -H "Content-Type: application/json" -H "Authorization: Bearer <TOKEN>" \
  -d '{"idCategoria":1,"codigoProducto":"CASCO-001","nombre":"Casco integral M",
       "precioVenta":250000,"costo":160000,"stockInicial":5,"stockMinimo":2}'
```

**3. Buscar** cascos activos a los que les queda poco stock:
```bash
curl "http://localhost:3000/productos?nombre=casco&estado=ACTIVO&disponibilidad=BAJO_STOCK" \
  -H "Authorization: Bearer <TOKEN>"
```

**4. Ajustar el stock** después de contar la mercancía (se envía cuántas unidades
hay y el motivo):
```bash
curl -X PATCH http://localhost:3000/productos/1/stock \
  -H "Content-Type: application/json" -H "Authorization: Bearer <TOKEN>" \
  -d '{"stockActual":4,"motivo":"Conteo físico del sábado"}'
```

**5. Ver el historial** del producto (solo el propietario):
```bash
curl http://localhost:3000/productos/1/movimientos \
  -H "Authorization: Bearer <TOKEN>"
```

Para probar todo con calma, copia `pruebas.http.example` como `pruebas.http` y
ábrelo en VS Code con la extensión REST Client. Ese archivo no se sube al
repositorio.

## Rutas

| Ruta | Quién la usa | Para qué |
|---|---|---|
| `POST /auth/login` | Todos | Iniciar sesión |
| `POST /empresas` y `GET /empresas` | Administrador | Registrar y ver negocios |
| `GET /empresas/:id` y `PATCH /empresas/:id` | Administrador | Ver un negocio, editarlo, activarlo o desactivarlo |
| `POST /usuarios` y `GET /usuarios` | Administrador, propietario | Crear y ver usuarios |
| `GET /usuarios/:id` y `PATCH /usuarios/:id` | Administrador, propietario | Ver un usuario, editarlo, activarlo o desactivarlo |
| `POST /categorias` y `PATCH /categorias/:id` | Propietario | Crear y editar categorías |
| `GET /categorias` y `GET /categorias/:id` | Propietario, vendedor | Ver categorías |
| `POST /productos` | Propietario, vendedor | Registrar un producto |
| `GET /productos` | Propietario, vendedor | Ver y buscar productos |
| `GET /productos/:id` y `PATCH /productos/:id` | Propietario, vendedor | Ver un producto, editarlo, activarlo o desactivarlo |
| `PATCH /productos/:id/stock` | Propietario, vendedor | Ajustar el stock, con motivo |
| `PATCH /productos/:id/stock-minimo` | Propietario | Cambiar el stock mínimo |
| `GET /productos/:id/movimientos` | Propietario | Ver el historial de movimientos |

**Para buscar productos** se pueden usar estos filtros, solos o combinados:
`nombre` y `codigo` (buscan el texto en cualquier parte), `idCategoria`, `estado`
(`ACTIVO` o `INACTIVO`) y `disponibilidad`: `DISPONIBLE` (queda al menos una
unidad), `AGOTADO` (no queda ninguna) o `BAJO_STOCK` (quedan tantas como el
mínimo, o menos).

## Si algo sale mal

| Código | Qué quiere decir |
|---|---|
| 400 | Algún dato está mal: falta un campo, tiene un valor que no sirve o pasa un límite |
| 401 | No has iniciado sesión, o tu sesión se venció |
| 403 | Tu tipo de usuario no tiene permiso para hacer eso |
| 404 | No existe, o es de otro negocio |
| 409 | Ya existe: el NIT, el correo, el código del producto o el nombre de la categoría está repetido |

## Pruebas

| Comando | Qué hace | ¿Necesita MySQL? |
|---|---|:-:|
| `npm test` | Corre las pruebas de cada parte por separado | No |
| `npm run test:cov` | Lo mismo, y muestra qué porcentaje del código está probado | No |
| `npm run test:e2e` | Prueba el sistema completo | Sí |
| `npm run build` | Revisa que todo compile | No |
| `npm run lint` | Revisa y arregla el formato del código | No |

Si `npm test` se queda detenido con un aviso de `watchman`, usa
`npx jest --watchman=false`.

## Cómo está organizado el código

```
src/
  common/      lo que comparten todos los módulos: roles, permisos y utilidades
  config/      la conexión con MySQL
  database/    el script que crea la cuenta de administrador
  modules/     un módulo por tema: auth, empresa, usuario, categoria y producto
test/          pruebas del sistema completo
```

Todos los módulos se organizan igual: en `entities/` están las tablas, en `dto/`
se revisan los datos que llegan, en `*.service.ts` van las reglas del negocio, en
`*.controller.ts` las rutas y quién puede usarlas, y en `*.spec.ts` las pruebas.

## Lo que falta

Ingreso de mercancía y proveedores, ventas, devoluciones, consulta entre negocios
aliados, alertas, predicción de abastecimiento y reportes.
