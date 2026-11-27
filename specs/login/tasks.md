# Tareas del acceso privado

- [x] Auditar el registro existente y aprobar el alcance.
- [x] Retirar la demo de la portada, el servidor y la agenda.
- [x] Separar el acceso público y exigir una sesión personal para la agenda.
- [x] Verificar agenda inicial vacía, creación, persistencia y aislamiento entre cuentas.
- [x] Registrar el resultado de tipos, compilación y pruebas.
- [x] Verificar la validación del registro, la unicidad del correo y el saludo personalizado.
- [x] Ajustar la conexión para Vercel y añadir una comprobación de solo lectura a Verify Qualy.
- [x] Aislar los límites de acceso por correo dentro de cada proceso.
- [x] Crear los proyectos gratuitos de Supabase para Preview y Production y comprobar la conexión mediante la integración.
- [x] Aplicar y verificar la migración de Qualy en Supabase Preview y Production.
- [x] Configurar `DATABASE_URL` por separado para Preview y Production en Vercel.
- [ ] Habilitar el límite por IP en Vercel.
- [ ] Verificar el flujo en Vercel Preview con Supabase de prueba.

## Evidencia

- Pasaron `npm run typecheck` y `npm run build` con Node.js 24.22.3.
- `npm test` pasó seis pruebas, incluidas dos cuentas aisladas en PostgreSQL desechable. También verificó el rechazo de sesiones antiguas de demo y de sesiones caducadas.
- `npm run test:e2e` pasó cuatro recorridos en Chromium. Cubrió registro vacío, creación y persistencia de entrenamientos y hábitos, cierre y reingreso, acceso anónimo, navegación hacia atrás y los formularios bilingües.
- Chromium confirmó el formulario a 320 px y la agenda inicial a 1440 px. En el servidor local, `/cuenta` devolvió 200, `/hoy` remitió al ingreso para una visita anónima y `/api/state` devolvió 401.
- Vercel denegó el acceso al consultar el proyecto y GitHub no mostró un Preview de `login`. La verificación en Supabase desde Preview sigue pendiente.
- Tras ajustar el registro, pasaron tipos, compilación, nueve pruebas unitarias y de integración y cuatro recorridos en Chromium. Dos solicitudes simultáneas con variantes del mismo correo dejaron una sola cuenta. En el navegador se verificaron el mensaje de contraseña inválida, el aviso de correo duplicado y el saludo por nombre.
- Con la preparación de producción pasaron `npm run typecheck`, `npm run build`, 11 pruebas con `npm test` y 4 recorridos con `npm run test:e2e`. Las pruebas nuevas cubren el límite compartido por variantes de un correo y la configuración de Postgres.js para Vercel.
- `npm run db:check` aceptó la base desechable migrada y detectó la ausencia del esquema. `npm run db:check -- --hosted` rechazó la conexión a localhost. La conexión activa de Qualy sigue apuntando a PostgreSQL local.
- El acceso conectado a Supabase mostró solo un proyecto inactivo sin vínculo confirmado con Qualy. Vercel devolvió `forbidden` al buscar el repositorio conectado. La configuración de ambos entornos, el límite por IP y la prueba del flujo alojado siguen pendientes.
- En Astodev se crearon [qualy-preview](https://supabase.com/dashboard/project/eewqfbigkdnjkfuksogt) y [qualy-production](https://supabase.com/dashboard/project/vallygylxabtidipevny). La integración confirmó $0 al mes por proyecto, estado activo y una consulta de solo lectura exitosa en PostgreSQL 17 en ambos. Ambos se crearon en `us-east-1`.
- Ambos proyectos registran la migración `20261125000000_create_qualy` con la versión del repositorio. Las cinco tablas tienen RLS y los roles `anon` y `authenticated` carecen de acceso al esquema privado. En Preview una prueba SQL comprobó la sesión, la agenda vacía y la restricción de correo único. El rollback retiró la cuenta y la sesión de prueba. Production quedó con cero cuentas.
- El navegador confirmó que [qualy-app](https://vercel.com/astodev/qualy-app) está vinculado a `iamFear/qualy-app`, usa `main` en producción y aún carece de `DATABASE_URL`. El conector de Vercel devolvió `403` para el alcance `astodev`.
- El navegador confirmó dos entradas `DATABASE_URL` en Vercel, una para Preview y otra para Production. La conexión efectiva de la aplicación se comprueba en el despliegue.
