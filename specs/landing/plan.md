# Plan de la landing

1. Definir [la identidad de Qualy](../../docs/identidad-qualy.md) y aplicar su paleta, fotografía y patrón a la portada.
2. Implementar `/` como página pública en Next.js. Montar el proveedor de agenda en el segmento que contiene `/hoy`, `/agenda`, `/entrenamientos`, `/habitos` y `/cuenta`. Mantener el proveedor de idioma en el layout raíz.
3. Reutilizar `/cuenta`, `/cuenta?modo=registro` y la vista de Hoy en `/hoy`. Una visita anónima ve los datos de ejemplo y la primera escritura conserva la lógica de sesión demo. Una cuenta autenticada ve su propia agenda. Las salidas de autenticación y cierre de sesión van a `/hoy` y `/`, respectivamente.
4. Verificar tipos, compilación y las pruebas de Playwright. Comprobar las rutas públicas y el flujo desde la landing, además de revisar el resultado visual en escritorio y móvil.
