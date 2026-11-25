# Tareas del acceso privado

- [x] Auditar el registro existente y aprobar el alcance.
- [x] Retirar la demo de la portada, el servidor y la agenda.
- [x] Separar el acceso público y exigir una sesión personal para la agenda.
- [x] Verificar agenda inicial vacía, creación, persistencia y aislamiento entre cuentas.
- [x] Registrar el resultado de tipos, compilación y pruebas.
- [x] Verificar la validación del registro, la unicidad del correo y el saludo personalizado.
- [ ] Verificar el flujo en Vercel Preview con Supabase de prueba.

## Evidencia

- Pasaron `npm run typecheck` y `npm run build` con Node.js 24.22.3.
- `npm test` pasó seis pruebas, incluidas dos cuentas aisladas en PostgreSQL desechable. También verificó el rechazo de sesiones antiguas de demo y de sesiones caducadas.
- `npm run test:e2e` pasó cuatro recorridos en Chromium. Cubrió registro vacío, creación y persistencia de entrenamientos y hábitos, cierre y reingreso, acceso anónimo, navegación hacia atrás y los formularios bilingües.
- Chromium confirmó el formulario a 320 px y la agenda inicial a 1440 px. En el servidor local, `/cuenta` devolvió 200, `/hoy` remitió al ingreso para una visita anónima y `/api/state` devolvió 401.
- Vercel denegó el acceso al consultar el proyecto y GitHub no mostró un Preview de `login`. La verificación en Supabase desde Preview sigue pendiente.
- Tras ajustar el registro, pasaron tipos, compilación, nueve pruebas unitarias y de integración y cuatro recorridos en Chromium. Dos solicitudes simultáneas con variantes del mismo correo dejaron una sola cuenta. En el navegador se verificaron el mensaje de contraseña inválida, el aviso de correo duplicado y el saludo por nombre.
