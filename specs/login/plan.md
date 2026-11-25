# Plan técnico del acceso a cuentas

**Estado** · Integración propuesta con Supabase Auth.

## Autenticación y datos

- Integrar Supabase Auth en Next.js mediante `@supabase/supabase-js` y `@supabase/ssr`. Compartir la lógica de validación de sesión entre la API y las pantallas. Conservar la lógica de idioma de `proxy.ts` al incorporar la renovación de sesión. Evitar el almacenamiento en caché de respuestas privadas o que establezcan cookies. [Supabase Auth para SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client) · [Autenticación en Next.js](https://nextjs.org/docs/app/guides/authentication)
- La API valida la sesión en el servidor y resuelve el propietario desde el identificador verificado. Conservar Postgres.js y el esquema `qualy` para datos de la app. Mantener las sesiones temporales de la demo separadas de las sesiones de Supabase Auth.
- Si hay cuentas reales, vincular cada UUID de Supabase Auth al identificador existente de `qualy.users` mediante una migración aditiva y una relación única. Comprobar cómo dar acceso a cada cuenta y ensayar el flujo de recuperación o activación que se elija. Conservar los IDs actuales y establecer el mecanismo de reversión antes de retirar las credenciales y sesiones anteriores.

## Correo y despliegue

- Configurar un proveedor SMTP transaccional en Supabase Auth, verificar el dominio remitente y probar la entrega de confirmación y recuperación en ambos idiomas. Revisar los límites de envío con el proveedor elegido. [SMTP de Supabase](https://supabase.com/docs/guides/auth/auth-smtp) · [Acceso por contraseña](https://supabase.com/docs/guides/auth/passwords)
- Usar un proyecto Supabase de prueba para Preview y uno de producción para Production, con variables de entorno de Vercel asignadas a cada entorno. Mantener `DATABASE_URL` solo en el servidor y configurar las URL de retorno autorizadas en Supabase Auth. Usar rutas de retorno exactas en producción. [Entornos de Vercel](https://vercel.com/docs/deployments/environments) · [Redirecciones de Supabase Auth](https://supabase.com/docs/guides/auth/redirect-urls)
- Ejecutar **Verify Qualy** con datos desechables. Añadir pruebas de acceso, recuperación y aislamiento según la especificación. Verificar la entrega de correo, los enlaces y el guardado de datos en Preview. Repetir una prueba controlada de los flujos críticos tras el despliegue de producción.
