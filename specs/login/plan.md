# Plan técnico del acceso privado

1. Mantener el registro por correo y contraseña, los identificadores de cuenta y la conexión de servidor a PostgreSQL con Postgres.js. El alta crea la cuenta y su sesión en una transacción.
   Validar el formato del correo y la contraseña en el alta. Guardar el correo sin espacios exteriores y en minúsculas para que la restricción única de PostgreSQL impida altas duplicadas. La vista Hoy toma el nombre de la cuenta autenticada.
2. Separar los formularios públicos de `/cuenta` de la carga del planificador. Al confirmar el acceso, navegar a `/hoy`. El servidor verifica la sesión antes de servir una página privada y en cada lectura o escritura de su API. Las consultas de datos conservan el filtro por propietario.
3. Retirar las superficies de demo, su endpoint y el contenido de ejemplo. Una sesión de demo antigua deja de autorizar operaciones. Los registros temporales existentes siguen su política de expiración.
4. Reutilizar los estados vacíos y las acciones de creación de la agenda. Al cerrar sesión, limpiar el estado privado del navegador y navegar a la portada.
5. Ejecutar las verificaciones de **Verify Qualy** con datos desechables. Cubrir registro, ingreso, salida, persistencia, acceso anónimo y aislamiento entre dos cuentas. Validar en Preview la conexión con un proyecto Supabase de prueba cuando esté configurado. [Conexión de Postgres.js con Supabase](https://supabase.com/docs/guides/database/postgres-js)
