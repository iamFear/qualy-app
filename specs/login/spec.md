# Acceso privado a Qualy

**Estado** · Alcance aprobado.

La portada presenta Qualy y permite crear una cuenta o iniciar sesión con correo y contraseña. Cada cuenta nueva empieza con una agenda personal vacía.

## Criterios de aceptación

| Flujo | Resultado esperado |
| --- | --- |
| Registro | La persona introduce nombre, un correo con formato válido y una contraseña de al menos ocho caracteres que incluya un signo de puntuación o un símbolo. Cada correo identifica una sola cuenta, incluso con cambios de mayúsculas o espacios al inicio o al final. Al crear la cuenta entra a Hoy con cero entrenamientos, hábitos y registros. |
| Inicio de sesión | La persona abre su agenda existente y el título de Hoy la saluda por su nombre. La sesión se conserva al recargar y el formulario muestra errores comprensibles si el acceso falla. |
| Agenda | La persona puede crear y guardar entrenamientos y hábitos. Los datos se conservan al recargar y al volver a iniciar sesión. |
| Acceso privado | La agenda y su API requieren una sesión personal válida. Sin sesión, una visita a una página privada lleva al inicio de sesión. Cada cuenta puede leer y modificar solo sus registros. |
| Cierre de sesión | Al confirmarse la salida, la vista oculta los datos privados y vuelve a la portada. Volver atrás o recargar requiere una sesión válida. |
| Retiro de la demo | Se retiran el acceso público a la demo y la creación de sesiones de ejemplo. Las sesiones antiguas de demo pierden acceso a la agenda. Las cuentas personales conservan su historial. |
| Idiomas | El acceso, sus mensajes y los estados vacíos están disponibles en español e inglés. |

La confirmación y la recuperación por correo corresponden a una propuesta posterior de integración con Supabase Auth.
