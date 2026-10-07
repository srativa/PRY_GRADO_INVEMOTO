# INVEMOTO

## 1. Descripción

En muchos negocios pequeños de accesorios para motos, las ventas y el inventario se
llevan en cuadernos. Así es difícil saber cuántas unidades quedan de un producto,
quién hizo un cambio o si un negocio aliado tiene lo que el cliente está buscando.
Eso pasaba en Moto Revolución Lujos y Accesorios S.A.S., el negocio para el que
estamos desarrollando este proyecto.

INVEMOTO es un sistema web y móvil que reúne esa información en un solo lugar: el
inventario se actualiza con cada movimiento, queda registro de quién hizo cada
cosa y los negocios aliados pueden ver si el otro tiene un producto disponible.
Más adelante también va a ayudar a decidir qué productos pedir y cuándo, a partir
de las ventas anteriores. Es nuestro proyecto de grado de Ingeniería de Sistemas
en la Universidad El Bosque.

**Código del proyecto:** <código del proyecto>

**Periodo académico:** <año / semestre>

## 2. Integrantes

| Nombre completo | Usuario GitHub | Correo institucional | Rol en el equipo |
|---|---|---|---|
| Andrés Felipe Mora Aguilar | <@usuario> | afmoraa@unbosque.edu.co | <rol> |
| Andrés Felipe Giral Santiago | <@usuario> | <correo> | <rol> |
| Samuel David Rátiva Martínez | @srativa | srativa@unbosque.edu.co | <rol> |

## 3. Tecnologías y requisitos previos

Para encender todo el proyecto basta con Docker. Lo demás solo hace falta si se
quiere trabajar en una parte sin Docker.

| Herramienta | Versión mínima | Notas |
|---|---|---|
| Git | Cualquier versión reciente | Para clonar el repositorio |
| Docker Desktop | Docker 24 con Docker Compose 2.24 | Enciende la base de datos, el backend, la aplicación web y el servicio de predicciones |
| Node.js | 20.19 (22.11 para la aplicación móvil) | Solo si se trabaja sin Docker. Los contenedores usan Node 20 |
| MySQL | 8.0 | Solo si se trabaja sin Docker. Docker usa la imagen `mysql:8.0` |
| Python | 3.12 | Solo si se trabaja en el servicio de predicciones sin Docker |
| NestJS | 11 | Backend, con TypeORM 0.3 y TypeScript 5 |
| React y Vite | React 19, Vite 8 | Aplicación web |
| React Native | 0.87 | Aplicación móvil. Necesita Android Studio o un celular conectado |
| FastAPI | 0.141 | Servicio de predicciones |

## 4. Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/<ORG>/<REPO>.git
cd <REPO>

# 2. Configurar las variables de entorno
cp .env.example .env
cp backend/.env.example backend/.env
```

En el `.env` de la raíz van el usuario y las contraseñas de MySQL. No cambies
`MYSQL_DATABASE`, porque el script de la base de datos siempre la crea con el
nombre `invemoto`.

En `backend/.env` cambia `JWT_SECRET` por una clave tuya y pon el correo y la
contraseña de la cuenta de administrador (`SEED_ADMIN_EMAIL` y
`SEED_ADMIN_PASSWORD`). Los datos de la base de datos de ese archivo no hace falta
tocarlos cuando se usa Docker, porque los toma del `.env` de la raíz.

Con Docker no hay que instalar dependencias a mano: se instalan solas la primera
vez que se encienden los contenedores.

**Importante:** nunca subir los archivos `.env` ni contraseñas reales al
repositorio. Si se agrega una variable nueva, hay que agregarla también al
`.env.example` correspondiente, sin valores reales.

## 5. Cómo ejecutar el proyecto

### Con Docker (todo el proyecto)

Desde la raíz del repositorio:

```bash
docker compose up --build
```

La primera vez se demora unos minutos mientras descarga todo. Cuando termine,
espera más o menos medio minuto a que el backend responda y crea la cuenta de
administrador (solo se hace una vez):

```bash
docker compose exec backend npm run seed
```

| Qué | Dónde |
|---|---|
| Backend | http://localhost:3000 |
| Aplicación web | http://localhost:5173 |
| Servicio de predicciones | http://localhost:8000/health |
| MySQL (desde Workbench) | `localhost`, puerto 3307 |

**Usuario de prueba:** la cuenta de administrador que crea `npm run seed`, con el
correo y la contraseña que pusiste en `backend/.env`. Con esa cuenta se crean las
empresas y sus propietarios, y cada propietario crea a sus vendedores.

MySQL usa el puerto 3307 en tu computador para no chocar con otro MySQL que ya
tengas instalado.

Para apagar todo usa `docker compose down`; la información no se pierde. La base
de datos se crea sola la primera vez con el script de `database/init/`. Si cambias
ese script y quieres empezar de cero, usa `docker compose down -v`, pero ojo:
**eso borra toda la información de la base**.

### Sin Docker (solo el backend)

Los pasos están en [backend/README.md](backend/README.md). La aplicación móvil no se
enciende con Docker; sus pasos están en [mobile/README.md](mobile/README.md).

## 6. Cómo ejecutar las pruebas

Las pruebas están en el backend. Desde la carpeta `backend`:

```bash
# Todas las pruebas unitarias
npm test

# Un solo archivo
npx jest src/modules/producto/producto.service.spec.ts

# Reporte de cobertura
npm run test:cov

# Pruebas del sistema completo (necesitan MySQL encendido y backend/.env listo)
npm run test:e2e
```

Si `npm test` se queda detenido con un aviso de `watchman`, agrega
`--watchman=false` al final (por ejemplo `npx jest --watchman=false`).

**Framework de pruebas:** Jest, con Supertest para las pruebas del sistema
completo.

**Cobertura actual:** 52 % de las líneas del backend (88 pruebas unitarias en 7
archivos, más 15 pruebas del sistema completo).

**Qué se está probando:**

- Quién puede hacer qué según su tipo de usuario (administrador, propietario y
  vendedor).
- Que cada negocio solo vea su propia información, y que al pedir algo de otro
  negocio el sistema responda que no existe.
- Productos: registro, búsqueda con filtros, ajuste de stock con motivo, historial
  de movimientos, stock mínimo y los límites de precio y stock.
- Categorías: creación, edición y nombres repetidos.
- Usuarios: quién puede crear, ver y editar a quién.
- Que ninguna ruta responda si no se ha iniciado sesión.

**Qué falta probar:** el inicio de sesión y las empresas no tienen pruebas
unitarias propias (sí se probaron a mano y con las pruebas del sistema completo).
La aplicación web y el servicio de predicciones todavía no tienen pruebas, y la
aplicación móvil solo tiene la que trae la plantilla, porque aún no tienen
funciones propias.

## 7. Estructura del repositorio

```
INVEMOTO/
├── backend/               # Servidor (NestJS)
│   ├── src/
│   │   ├── common/        # Roles, permisos y utilidades que usan todos los módulos
│   │   ├── config/        # Conexión con MySQL
│   │   ├── database/      # Script que crea la cuenta de administrador
│   │   └── modules/       # auth, empresa, usuario, categoria y producto
│   ├── test/              # Pruebas del sistema completo
│   └── pruebas.http.example  # Pruebas manuales para la extensión REST Client
├── frontend/              # Aplicación web (React con Vite)
├── mobile/                # Aplicación móvil (React Native)
├── analytics/             # Servicio de predicciones (Python con FastAPI)
├── database/
│   └── init/              # Script que crea la base de datos
├── docker-compose.yml     # Enciende todo el proyecto con Docker
├── .env.example           # Variables de MySQL para Docker
├── .gitignore
└── README.md
```

## 8. Flujo de trabajo con Git

- La rama `main` siempre debe funcionar. Nadie sube cambios directo a `main`.
- Cada uno trabaja en su propia rama: `feat/<descripcion-corta>` para funciones
  nuevas, `fix/<descripcion-corta>` para arreglos y `docs/<descripcion-corta>`
  para documentación.
- Todo cambio entra a `main` con un pull request que revisa al menos otro
  integrante.
- Los mensajes de commit siguen el formato Conventional Commits, por ejemplo
  `feat: agrega registro de productos` o `fix: corrige el ajuste de stock`.

## 9. Estado del proyecto y avances

**Lo que ya funciona (backend):** inicio de sesión, registro de empresas y
usuarios con tres tipos de usuario, categorías, registro y búsqueda de productos,
ajuste de stock con motivo, stock mínimo e historial de movimientos. Todo se puede
encender con Docker.

**Lo que está empezado:** la aplicación web y la móvil están creadas pero todavía
no tienen pantallas de INVEMOTO, y el servicio de predicciones enciende pero aún no
tiene el modelo.

| Entrega | Fecha | Alcance comprometido | Estado |
|---|---|---|---|
| Entrega 1 | <dd/mm/aaaa> | <alcance> | Completado |
| Entrega 2 | <dd/mm/aaaa> | <alcance> | Pendiente |

## 10. Decisiones técnicas relevantes

- **Un servidor con NestJS y TypeScript.** NestJS obliga a ordenar el código por
  módulos (usuarios, productos, etc.), lo que nos facilita repartir el trabajo
  entre los tres. Además, usar TypeScript en el servidor, la aplicación web y la
  móvil nos permite trabajar con un solo lenguaje.
- **React Native para la aplicación móvil.** Con un solo código sirve para Android
  y para iPhone, y usa el mismo lenguaje y la misma forma de trabajar que la
  aplicación web en React.
- **MySQL 8 y el script SQL como referencia.** Las tablas se definen a mano en
  `database/init/` y el backend nunca las crea ni las cambia por su cuenta. Así la
  base de datos coincide siempre con el modelo de datos que diseñamos.
- **Un servicio aparte en Python para las predicciones.** Las librerías de análisis
  de datos y aprendizaje automático (pandas, scikit-learn) están en Python, así que
  esa parte va en un servicio propio con FastAPI que lee la misma base de datos.
- **Varios negocios en el mismo sistema, cada uno con lo suyo.** La empresa de cada
  usuario se toma de su sesión y no de lo que envíe, para que nadie pueda ver ni
  cambiar datos de otro negocio. Si alguien pide algo de otro negocio, el sistema
  responde que no existe, para no revelar qué hay.
- **Nada se borra, se desactiva.** Así no se pierde la historia de lo que ya se
  registró (empresas, usuarios, productos y sus movimientos).
- **Cada cambio de stock queda anotado.** Se guarda cuánto cambió, el motivo, quién
  lo hizo y cuándo. El cambio y su registro se guardan juntos, y si dos personas
  ajustan el mismo producto al tiempo, el sistema atiende un ajuste a la vez para
  que las cuentas no se descuadren.
- **Inicio de sesión con token y contraseñas cifradas.** Al iniciar sesión el
  sistema entrega un token (JWT) que dura 8 horas, y las contraseñas se guardan
  cifradas con bcrypt, nunca como texto.
- **Docker para que todos tengamos el mismo entorno.** Con un solo comando se
  encienden la base de datos, el backend, la aplicación web y el servicio de
  predicciones, con las mismas versiones en todos los computadores.

## 11. Limitaciones conocidas y trabajo futuro

**Limitaciones:**

- Si se desactiva a un usuario que tenía la sesión abierta, puede seguir usando
  el sistema hasta que se le venza la sesión (máximo 8 horas).
- La consulta entre negocios aliados todavía no se ha probado con aliados reales;
  por ahora solo trabajamos con Moto Revolución.

**Trabajo pendiente:**

- Ventas, ingreso de mercancía y proveedores, y devoluciones.
- Consulta de productos entre negocios aliados.
- Alertas de bajo stock y reportes.
- Modelo de predicción de abastecimiento.
- Pantallas de la aplicación web y de la aplicación móvil.

## 12. Créditos y referencias

- [NestJS](https://docs.nestjs.com/) y [TypeORM](https://typeorm.io/): documentación
  oficial usada para el backend.
- [MySQL 8](https://dev.mysql.com/doc/refman/8.0/en/): base de datos.
- [React](https://react.dev/) y [Vite](https://vite.dev/): aplicación web.
- [React Native](https://reactnative.dev/): aplicación móvil.
- [FastAPI](https://fastapi.tiangolo.com/): servicio de predicciones.
- [Docker](https://docs.docker.com/): entorno de desarrollo.
- [Jest](https://jestjs.io/) y [Supertest](https://github.com/ladjs/supertest):
  pruebas.

## 13. Licencia

<licencia elegida>. Los detalles están en el archivo [LICENSE](LICENSE).
