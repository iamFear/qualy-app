# Landing pública de Qualy

La primera visita debe explicar qué es Qualy, cómo ayuda a planificar entrenamientos y seguir hábitos, y qué puede hacer una persona antes y después de crear una cuenta.

## Criterios de aceptación

- `/` muestra la landing y los accesos a iniciar sesión y crear cuenta. La propuesta de valor se puede leer aunque la API de la agenda esté indisponible.
- Los enlaces abren los formularios públicos. Al iniciar sesión o crear una cuenta se abre la agenda. Al cerrar sesión se vuelve a la landing.
- En cuanto el servidor confirma el cierre de sesión, la vista oculta los datos privados. El regreso a la portada prescinde de una segunda consulta a la API de la agenda.
- La página respeta la preferencia ES/EN al navegar. La jerarquía, el foco y las acciones se mantienen utilizables en escritorio y móvil.
- La cabecera reúne la marca, el selector de idioma y el acceso a la cuenta.
- La guía define el símbolo, los colores, la tipografía, el patrón y el tono de la marca. La portada aplica esas decisiones.

La autenticación, la recuperación de acceso y el almacenamiento de las cuentas se rigen por la [especificación del login](../login/spec.md).
