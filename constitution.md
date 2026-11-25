# Constitución de Qualy

1. **Stack de producción.** Qualy usa Next.js App Router y TypeScript en modo estricto. Vercel sirve la aplicación. Supabase aloja PostgreSQL y el servidor accede a los datos con Postgres.js. Las migraciones se versionan en `supabase/migrations/`.
2. **Aislamiento de datos.** El servidor verifica la identidad y comprueba la propiedad de los datos en las lecturas y escrituras privadas. Las credenciales de servidor quedan fuera del código cliente y de Git. Las pruebas y los despliegues Preview usan datos y credenciales de prueba.
3. **Continuidad.** Los cambios de identidad y esquema conservan el historial y el acceso de las cuentas existentes. El plan define cómo probar la transición y recuperarse de un fallo antes de aplicarla en producción.
4. **Experiencia bilingüe.** Los flujos de usuario, incluidos mensajes de error y correos de cuenta, están disponibles en español e inglés. El selector de idioma conserva su preferencia durante el flujo.
5. **Evidencia de aceptación.** Las funcionalidades se especifican antes de implementarse. **Verify Qualy** verifica tipos, pruebas e integración con PostgreSQL, compilación y recorridos de navegador. Para integraciones externas, registra también el resultado de las pruebas con los servicios configurados.
6. **Herramientas gratuitas.** Todas las herramientas que se utilicen o propongan deben ser gratuitas, aunque pueden tener costos dependiendo de escalabilidad, nunca usaremos una herramienta que dependa de colocar una tarjeta para poder utilizarla.
