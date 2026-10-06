# INVEMOTO

Sistema de información multiplataforma para la gestión de inventario, ventas y
predicción de abastecimiento de establecimientos de accesorios para motocicletas,
con disponibilidad compartida de productos entre negocios aliados.

Proyecto de grado de Ingeniería de Sistemas (Universidad El Bosque, 2026),
desarrollado para el beneficiario Moto Revolución Lujos y Accesorios S.A.S.

## Qué resuelve

Un negocio pequeño de accesorios para motos suele llevar las ventas y el
inventario en cuadernos, sin conexión entre ambos y sin forma de saber si un
producto faltante está disponible en un negocio aliado. INVEMOTO centraliza
esa información, mantiene el inventario al día con cada operación, deja huella de
quién cambió qué y prepara el camino para apoyar las decisiones de reposición con
datos.

## Cómo está organizado

```
  App web (React)    ─┐
                      ├─>  Backend (NestJS)  ─>  MySQL 8  <─  Analítica (Python)
  App móvil (RN)     ─┘
```

| Carpeta | Qué contiene | Tecnología | Puerto |
|---|---|---|:-:|
| `backend/` | API REST y lógica de negocio | NestJS, TypeORM | 3000 |
| `database/` | Esquema de la base de datos | MySQL 8 | 3307 |
| `frontend/` | Aplicación web | React, TypeScript, Vite | 5173 |
| `mobile/` | Aplicación móvil | React Native | |
| `analytics/` | Servicio de analítica predictiva | Python, FastAPI | 8000 |

El puerto de MySQL en tu equipo es el 3307 (no el 3306), para que no choque con
un MySQL que ya tengas instalado.

## Estado actual

| Componente | Estado |
|---|---|
| Backend | En desarrollo. Autenticación, empresas, usuarios, categorías y productos con inventario e historial de movimientos. Faltan ventas, ingresos de mercancía, devoluciones y más. Detalle en [`backend/README.md`](backend/README.md) |
| Base de datos | Esquema completo en `database/init/invemoto_schema_mysql8.sql` |
| Frontend | Plantilla inicial de React con Vite. Sin pantallas de INVEMOTO todavía |
| Mobile | Proyecto de React Native inicializado. Sin pantallas todavía |
| Analítica | Servicio base con un endpoint de salud (`/health`). Sin modelo predictivo todavía |

## Levantar todo con Docker

Necesitas Docker Desktop. La primera vez, prepara dos archivos de configuración
(ninguno se sube al repositorio):

1. **`.env` en la raíz**, copiado de `.env.example`. Define el usuario y las
   contraseñas de MySQL. No cambies `MYSQL_DATABASE`: el script de la base de datos
   siempre la crea con el nombre `invemoto`.
2. **`backend/.env`**, copiado de `backend/.env.example`. Pon tu propio `JWT_SECRET`
   y revisa la cuenta ADMIN inicial (`SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD`).
   Los datos de conexión a la base (`DB_*`) no importan aquí: con Docker se toman
   solos del `.env` de la raíz.

La carpeta `analytics/` puede tener su propio `.env`, pero no es obligatorio.

Luego, desde la raíz del repositorio:

```bash
docker compose up --build
```

La primera vez tarda unos minutos porque descarga y construye las imágenes. Después
de arrancar, el backend puede tardar alrededor de medio minuto en responder.

Cuando el backend esté listo, crea la cuenta ADMIN inicial (solo la primera vez):

```bash
docker compose exec backend npm run seed
```

Y listo:

| Servicio | Dirección |
|---|---|
| Backend | http://localhost:3000 |
| Aplicación web | http://localhost:5173 |
| Analítica | http://localhost:8000/health |
| MySQL (Workbench u otro cliente) | `localhost`, puerto 3307 |

Para apagar todo: `docker compose down`. Tus datos se conservan.

La base de datos se crea sola con el script de `database/init/` la primera vez que
arranca MySQL. Si cambias ese script y quieres empezar de cero, apaga todo con
`docker compose down -v`. **Ese comando borra todos los datos de la base.**

¿Prefieres trabajar sin Docker? Mira [`backend/README.md`](backend/README.md).

## Estructura del repositorio

```
backend/      API REST (NestJS)
frontend/     aplicación web (React)
mobile/       aplicación móvil (React Native)
analytics/    servicio de analítica (FastAPI)
database/     esquema de la base de datos
docker-compose.yml
```

## Cómo colaborar

- Trabaja siempre en una rama propia por funcionalidad, nunca directo en `main`.
- Integra los cambios con un pull request, revisado por otro integrante.
- No subas archivos `.env` ni tu `pruebas.http`: tienen contraseñas y tokens.

## Equipo

- Andrés Felipe Mora Aguilar
- Andrés Felipe Giral Santiago
- Samuel David Rátiva Martínez

Programa de Ingeniería de Sistemas, Facultad de Ingeniería, Universidad El Bosque.
Modalidad de grado: Desarrollo Tecnológico.
