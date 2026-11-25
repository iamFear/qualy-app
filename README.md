# Qualy

Qualy reúne tu agenda de entrenamientos y tus hábitos diarios en un espacio personal. Al abrir el panel, puedes ver qué entrenar, a qué hora y qué hábitos te faltan por registrar.

![Panel de Qualy en modo demo con el calendario semanal, un entrenamiento programado y cuatro hábitos](docs/qualy-dashboard.jpg)

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
2. Aplica la [migración SQL inicial](supabase/migrations/20261125000000_create_qualy.sql) una vez desde el SQL Editor de ese proyecto. El esquema `qualy` se usa desde el servidor.
3. Reinicia Qualy. Si el servidor necesita una CA específica para validar TLS, configura `DATABASE_SSL_CA` con el certificado PEM.

El **Session pooler** es la opción recomendada para el servidor persistente de Qualy y funciona por IPv4. Para un alojamiento con procesos de corta duración, puedes usar el **Transaction pooler**. La conexión se realiza con Postgres.js y la URI se mantiene en el servidor. [Documentación de Supabase sobre Postgres.js](https://supabase.com/docs/guides/database/postgres-js)

También puedes usar una instancia local de PostgreSQL durante el desarrollo. Si ya inicializaste un clúster propio, configura `DATABASE_URL` con el host `127.0.0.1` y apunta `QUALY_LOCAL_PG_DATA` a su directorio de datos. `npm run dev` y `npm start` lo arrancarán si está detenido. Usa `QUALY_LOCAL_PG_CTL` para indicar la ruta de `pg_ctl` si el ejecutable no está en tu PATH.

### Importar datos de SQLite

Con el esquema de destino vacío y Qualy detenido durante el cambio, ejecuta:

```sh
npm run db:import-sqlite
```

Puedes pasar otro archivo con `npm run db:import-sqlite -- /ruta/qualy.sqlite`. La importación conserva los identificadores, las cuentas, las sesiones, los entrenamientos y los hábitos. Lee SQLite en modo de solo lectura y copia los datos en una transacción. Si el destino ya contiene registros de Qualy, el comando termina sin sobrescribirlos.

La página inicial muestra una demo que se puede explorar sin cuenta. Sin conexión configurada, la demo inicial se puede consultar. Los cambios de la demo se guardan durante siete días en su propia sesión. Al registrarte, Qualy abre una agenda personal vacía.

## Funciones

- **Español e inglés.** Usa ES o EN en la barra superior. Qualy recuerda el idioma en el navegador y conserva el contenido personal tal como lo escribiste.
- **Hoy y agenda.** Consulta una semana a la vez, cambia de día y revisa la fecha y hora de cada sesión.
- **Entrenamientos.** Crea, edita y completa sesiones. Cada ejercicio puede tener series, repeticiones, segundos de descanso, instrucciones y un video. Puedes iniciar un temporizador de descanso desde el detalle.
- **Hábitos.** Agrega, edita y quita hábitos desde su sección. Un hábito fijo se marca como hecho. En un hábito con contador puedes sumar o restar unidades hacia una meta diaria. Puedes editar el tipo, la meta y la unidad. Al quitar un hábito, el historial anterior sigue disponible.
- **Cuenta privada.** Regístrate con correo y contraseña. El servidor asocia tus sesiones de entrenamiento, hábitos y registros a tu cuenta.

## Arquitectura

Qualy usa TypeScript en modo estricto. Next.js usa el App Router para las pantallas de Hoy, Agenda, Entrenamientos, Hábitos y Mi cuenta. La interfaz usa React y CSS. La API JSON usa Route Handlers en el runtime de Node.js. PostgreSQL en Supabase guarda cuentas, sesiones de acceso, entrenamientos, hábitos y registros diarios. La API se conecta con el paquete `postgres` (Postgres.js). La actualización de un contador sucede dentro de una transacción para conservar incrementos simultáneos.

Qualy guarda contraseñas derivadas con scrypt y almacena el hash de los tokens de sesión. La cookie de sesión es `HttpOnly` y `SameSite=Strict`. El servidor valida las solicitudes de escritura y usa el identificador de la sesión para determinar qué registros puede consultar y modificar cada cuenta. Los límites para abrir demos y para registrarse o iniciar sesión se aplican por proceso de Node.js.

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

Las pruebas unitarias cubren el calendario y el idioma. Para ejecutar también las pruebas de integración, configura `QUALY_TEST_DATABASE_URL` con una base PostgreSQL de prueba y vuelve a ejecutar `npm test`. Las pruebas crean esquemas temporales y verifican el aislamiento entre cuentas y demos, la validación de datos, los incrementos concurrentes y la persistencia después de reiniciar la API.

### Pruebas en navegador

Aplica las migraciones de `supabase/migrations/` a una base desechable y usa su URI como `QUALY_TEST_DATABASE_URL`. Las pruebas crean cuentas y registros de prueba. Playwright arranca la versión de producción de Qualy en el puerto `44321`.

```sh
npx playwright install chromium
npm run build
npm run test:e2e
```

## GitHub Actions y Vercel

El workflow [Qualy CI](.github/workflows/ci.yml) corre en pull requests hacia `main` y en pushes a `main`. Usa Node.js 24, un contenedor PostgreSQL 18 y Chromium para verificar tipos, ejecutar las pruebas unitarias y de integración y probar la compilación de producción. GitHub conserva una traza si falla una prueba de navegador.

1. Publica el repositorio en GitHub y verifica que pase **Verify Qualy**. En las reglas de la rama `main`, exige ese check para fusionar cambios.
2. Aplica las migraciones SQL de Qualy en Supabase. Al importar el repositorio en Vercel, selecciona `main` como rama de producción y configura `DATABASE_URL` con la URI del **Transaction pooler** de Supabase. Usa una base de prueba para los despliegues Preview y configura una CA con `DATABASE_SSL_CA` si tu conexión lo requiere. [Postgres.js en Supabase](https://supabase.com/docs/guides/database/postgres-js)
3. Mantén habilitado **Automatically expose System Environment Variables** en Vercel. Qualy usa el dominio de la solicitud para validar el origen HTTPS y emitir cookies seguras. Deja `QUALY_ORIGIN` sin definir en Vercel para admitir los dominios de Preview y Production. [Variables del sistema de Vercel](https://vercel.com/docs/environment-variables/system-environment-variables)
4. En **Vercel → Settings → Build and Deployment → Deployment Checks**, añade el check de GitHub **Verify Qualy**. Vercel construye el despliegue al recibir el commit y espera el resultado del check antes de asignarlo al dominio de producción. [Deployment Checks](https://vercel.com/docs/deployment-checks)

## Recursos

- Portada de entrenamiento generada con ImageGen para Qualy. El encargo fue una fotografía editorial de un atleta con mancuernas a la derecha, en un gimnasio oscuro de tonos verdes, con espacio para el texto a la izquierda.
- Tipografías DM Sans y Outfit bajo SIL Open Font License. [Licencias de los recursos](licenses).
- Íconos Unicons de Iconscout bajo Apache 2.0. [Proyecto Unicons](https://github.com/Iconscout/unicons).
- Videos de ejemplo de CrossFit. [Sentadilla frontal](https://www.youtube.com/watch?v=B86Zj72LwzA), [flexiones](https://www.youtube.com/watch?v=_l3ySVKYVJ8) y [peso muerto](https://www.youtube.com/watch?v=JNpUNRPQkAk).
