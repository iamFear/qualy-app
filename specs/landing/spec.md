# Landing pública de Qualy

La primera visita debe explicar qué es Qualy, cómo ayuda a planificar entrenamientos y seguir hábitos, y qué puede hacer una persona antes y después de crear una cuenta.

## Criterios de aceptación

- `/` muestra la landing y los accesos a iniciar sesión, crear cuenta y probar la demo. La propuesta de valor se puede leer aunque la API de la agenda esté indisponible.
- Los enlaces abren los formularios existentes y la demo interactiva. Al iniciar sesión o crear una cuenta se abre la agenda. Al cerrar sesión se vuelve a la landing. Una sesión personal conserva su agenda.
- En cuanto el servidor confirma el cierre de sesión, la vista oculta los datos privados. El regreso a la portada prescinde de una segunda consulta a la API de la agenda.
- La demo se puede explorar sin registro y conserva el mecanismo de guardado de prueba actual. Sus datos continúan aislados de las cuentas personales.
- La página respeta la preferencia ES/EN al navegar. La jerarquía, el foco y las acciones se mantienen utilizables en escritorio y móvil.
- La cabecera reúne la marca, el selector de idioma y el acceso a la cuenta. La tarjeta sobre la foto identifica los datos de ejemplo en su propio título.
- La guía define el símbolo, los colores, la tipografía, el patrón y el tono de la marca. La portada aplica esas decisiones.

La autenticación, la recuperación de acceso y el almacenamiento de las cuentas se rigen por la [especificación del login](../login/spec.md).
