# Acceso a cuentas en producción

**Estado** · Propuesta para revisión.

## Objetivo

Permitir que las personas creen una cuenta, inicien y cierren sesión, y recuperen su acceso por correo. La pantalla **Mi cuenta** ya permite registrarse e iniciar sesión. Esta especificación incorpora confirmación de correo y recuperación de contraseña para producción y conserva el acceso de las cuentas existentes.

## Criterios de aceptación

| Flujo | Resultado esperado |
| --- | --- |
| Registro | La persona introduce nombre, correo y contraseña. Recibe un mensaje de confirmación y puede acceder a su agenda privada tras verificar el correo. |
| Inicio y cierre de sesión | Una cuenta confirmada abre su agenda y conserva la sesión al recargar. Al cerrar sesión, la agenda privada deja de estar accesible desde ese navegador, incluso tras recargar o volver atrás. |
| Recuperación | Desde **Mi cuenta**, la persona solicita un enlace para elegir una contraseña nueva. Un enlace válido permite el cambio y la contraseña anterior deja de servir para iniciar sesión. |
| Errores | El formulario guía a la persona ante credenciales inválidas y enlaces vencidos o usados. La respuesta al solicitar recuperación es la misma para correos registrados y desconocidos. |
| Privacidad y demo | Cada cuenta consulta y modifica solo sus datos. La demo continúa disponible y sus registros temporales se mantienen aislados de las cuentas personales. |
| Cuentas existentes | Una cuenta previa puede recuperar el acceso y conserva sus entrenamientos, hábitos y registros. |
| Idiomas | Los formularios, correos y mensajes del flujo se muestran en español o inglés según la preferencia de la persona. |

El alcance cubre correo y contraseña. El acceso con cuentas de terceros y la autenticación multifactor se podrán especificar como funcionalidades futuras.
