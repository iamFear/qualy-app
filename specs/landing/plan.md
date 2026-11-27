# Plan de la landing

1. Definir [la identidad de Qualy](../../docs/identidad-qualy.md) y aplicar su paleta, fotografía y patrón a la portada.
2. Implementar `/` como página pública en Next.js. Montar el proveedor de agenda en el segmento que contiene `/hoy`, `/agenda`, `/entrenamientos`, `/habitos` y `/cuenta`. Mantener el proveedor de idioma en el layout raíz.
3. Enlazar `/cuenta` y `/cuenta?modo=registro` desde la portada. Una cuenta autenticada abre su propia agenda en `/hoy`. Al cerrar sesión vuelve a `/`.
4. Verificar tipos, compilación y las pruebas de Playwright. Comprobar las rutas públicas y el flujo desde la landing, además de revisar el resultado visual en escritorio y móvil.
