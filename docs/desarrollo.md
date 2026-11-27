# Desarrollo y despliegue de Qualy

Configuración local, pruebas y despliegue del proyecto. [Guía de uso de Qualy](../README.md)

## Especificaciones

La [constitución de Qualy](../constitution.md) reúne los principios del proyecto. Para el acceso a cuentas, consulta la [especificación](../specs/login/spec.md), el [plan técnico](../specs/login/plan.md) y las [tareas](../specs/login/tasks.md).

La [especificación de la landing](../specs/landing/spec.md) documenta los accesos desde la portada. La [guía de identidad](identidad-qualy.md) contiene la paleta, la tipografía y el patrón visual.

## Ejecutar en local

Necesitas Node.js 24. Para guardar cambios, configura PostgreSQL. Si es una copia nueva, crea `.env.local` a partir de `.env.example`.

```sh
npm ci
npm run dev
```

Abre [Qualy en tu navegador](http://127.0.0.1:4317). Para ejecutar la compilación de producción en local:

```sh
npm run build
npm start
```

### Configurar Supabase

1. Abre **Connect** en tu proyecto de Supabase, copia la URI del **Session pooler** y guárdala en `DATABASE_URL` dentro de `.env.local`.
2. Aplica la [migración SQL inicial](../supabase/migrations/20261125000000_create_qualy.sql) una vez desde el SQL Editor de ese proyecto. El esquema `qualy` se usa desde el servidor.
3. Reinicia Qualy. Si el servidor necesita una CA específica para validar TLS, configura `DATABASE_SSL_CA` con el certificado PEM.

El **Session pooler** es la opción recomendada para el servidor persistente de Qualy y funciona por IPv4. Para un alojamiento con procesos de corta duración, puedes usar el **Transaction pooler**. La conexión se realiza con Postgres.js y la URI se mantiene en el servidor. [Documentación de Supabase sobre Postgres.js](https://supabase.com/docs/guides/database/postgres-js)

También puedes usar una instancia local de PostgreSQL durante el desarrollo. Si ya inicializaste un clúster propio, configura `DATABASE_URL` con el host `127.0.0.1` y apunta `QUALY_LOCAL_PG_DATA` a su directorio de datos. `npm run dev` y `npm start` lo arrancarán si está detenido. Usa `QUALY_LOCAL_PG_CTL` para indicar la ruta de `pg_ctl` si el ejecutable no está en tu PATH.

### Importar datos de SQLite

Con el esquema de destino vacío y Qualy detenido durante el cambio, ejecuta:

```sh
npm run db:import-sqlite
```

Puedes pasar otro archivo con `npm run db:import-sqlite -- /ruta/qualy.sqlite`. La importación conserva los identificadores, las cuentas, las sesiones, los entrenamientos y los hábitos. Lee SQLite en modo de solo lectura y copia los datos en una transacción. Si el destino ya contiene registros de Qualy, el comando termina sin sobrescribirlos.

## Arquitectura

Qualy usa TypeScript en modo estricto. Next.js usa el App Router para las pantallas de Hoy, Agenda, Entrenamientos, Hábitos y Mi cuenta. La interfaz usa React y CSS. La API JSON usa Route Handlers en el runtime de Node.js. PostgreSQL en Supabase guarda cuentas, sesiones de acceso, entrenamientos, hábitos y registros diarios. La API se conecta con el paquete `postgres` (Postgres.js). La actualización de un contador sucede dentro de una transacción para conservar incrementos simultáneos.

Qualy guarda contraseñas derivadas con scrypt y almacena el hash de los tokens de sesión. La cookie de sesión es `HttpOnly` y `SameSite=Strict`. Los formularios de ingreso y registro son públicos. Las páginas de la agenda y su API exigen una sesión personal válida. El servidor usa la identidad verificada para determinar qué registros puede consultar y modificar cada cuenta. Los límites para registrarse o iniciar sesión se aplican por proceso de Node.js.

| Variable | Predeterminado | Uso |
| --- | --- | --- |
| `PORT` | `4317` | Puerto HTTP |
| `QUALY_HOST` | `127.0.0.1` | Dirección de escucha |
| `DATABASE_URL` | — | URI de PostgreSQL para los Route Handlers y la importación |
| `DATABASE_SSL_CA` | — | Certificado CA PEM para la validación TLS cuando la conexión lo requiere |
| `QUALY_ORIGIN` | Origen HTTP local | Configura el origen HTTPS exacto para habilitar las cookies `Secure` al alojar Qualy detrás de un proxy TLS |

Las fechas y las horas usan el calendario de Bogotá (`America/Bogota`). Para alojar Qualy en otro equipo, usa Node.js con HTTPS y una conexión de servidor a PostgreSQL. Esta versión ofrece acceso con correo y contraseña. La recuperación de contraseña queda pendiente.

Los videos se agregan con una URL HTTPS. Al abrir un video, Qualy puede insertar YouTube o Vimeo y reproducir archivos MP4, WebM u Ogg desde su URL. Siempre ofrece también el enlace original. Esta integración depende de que el proveedor mantenga el video disponible.

## Pruebas

```sh
npm run typecheck
npm test
```

Las pruebas unitarias cubren el calendario y el idioma. Para ejecutar también las pruebas de integración, configura `QUALY_TEST_DATABASE_URL` con una base PostgreSQL de prueba y vuelve a ejecutar `npm test`. Las pruebas crean esquemas temporales y verifican el aislamiento entre cuentas, el estado inicial vacío, la validación de datos, los incrementos concurrentes y la persistencia después de reiniciar la API.

### Pruebas en navegador

Aplica las migraciones de `supabase/migrations/` a una base desechable y usa su URI como `QUALY_TEST_DATABASE_URL`. Las pruebas crean cuentas y registros de prueba. Playwright arranca la versión de producción de Qualy en el puerto `44321`.

```sh
npx playwright install chromium
npm run build
npm run test:e2e
```

## GitHub Actions y Vercel

El workflow [Qualy CI](../.github/workflows/ci.yml) corre en pull requests hacia `main` y en pushes a `main`. Usa Node.js 24, un contenedor PostgreSQL 18 y Chromium para verificar tipos, ejecutar las pruebas unitarias y de integración y probar la compilación de producción. GitHub conserva una traza si falla una prueba de navegador.

1. Publica el repositorio en GitHub y verifica que pase **Verify Qualy**. En las reglas de la rama `main`, exige ese check para fusionar cambios.
2. Aplica las migraciones SQL versionadas de Qualy a los proyectos Supabase de Preview y Production. Guarda en cada entorno de Vercel su propia `DATABASE_URL` con la URI del **Transaction pooler**. Si la conexión requiere una CA, configura `DATABASE_SSL_CA` en el mismo entorno. Qualy verifica TLS y usa hasta una conexión por instancia de Vercel. [Conexiones de Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres#configure-your-client)
3. Con las variables de la base de destino cargadas en una terminal segura, ejecuta `npm run db:check -- --hosted`. La comprobación valida la conexión, las tablas y los permisos del rol sin leer datos de las cuentas. Usa la URI correspondiente a cada entorno.
4. Al importar el repositorio, selecciona `main` como rama de producción. Mantén habilitado **Automatically expose System Environment Variables** y deja `QUALY_ORIGIN` sin definir. Qualy usa el dominio de la solicitud para validar el origen HTTPS y emitir cookies seguras. [Variables del sistema de Vercel](https://vercel.com/docs/environment-variables/system-environment-variables)
5. En **Vercel → Settings → Build and Deployment → Deployment Checks**, añade el check de GitHub **Verify Qualy**. Vercel construye el despliegue al recibir el commit y espera el resultado del check antes de asignarlo al dominio de producción. [Deployment Checks](https://vercel.com/docs/deployment-checks)
6. En **Firewall**, configura una regla de límite por IP para `POST /api/login` y `POST /api/register`. Empieza con 30 solicitudes por 10 minutos y una respuesta 429 al exceder el límite. La aplicación también limita intentos por correo dentro de cada proceso. [Límites de solicitudes de Vercel](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting)
7. Prueba en Preview el registro de dos cuentas con datos desechables, el saludo, la agenda vacía, el rechazo de un correo duplicado, el aislamiento de hábitos y entrenamientos y el cierre y reingreso. Si hay cuentas personales en una base anterior, respáldala y verifica que sus cuentas y su historial sigan accesibles tras ensayar la migración en la base de prueba.

## Recursos

- Portada de entrenamiento generada con ImageGen para Qualy. El encargo fue una fotografía editorial de un atleta con mancuernas a la derecha, en un gimnasio oscuro de tonos verdes, con espacio para el texto a la izquierda.
- Tipografías DM Sans y Outfit bajo SIL Open Font License. [Licencias de los recursos](../licenses).
- Íconos Unicons de Iconscout bajo Apache 2.0. [Proyecto Unicons](https://github.com/Iconscout/unicons).
- Videos de ejemplo de CrossFit. [Sentadilla frontal](https://www.youtube.com/watch?v=B86Zj72LwzA), [flexiones](https://www.youtube.com/watch?v=_l3ySVKYVJ8) y [peso muerto](https://www.youtube.com/watch?v=JNpUNRPQkAk).
