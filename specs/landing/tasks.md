# Tareas de la landing

- [x] Definir la identidad, el símbolo, el tono y el patrón.
- [x] Implementar la portada bilingüe y situar la agenda en `/hoy`.
- [x] Verificar los accesos de ingreso, registro y demo mediante una compilación de producción.
- [x] Revisar la composición, la navegación y el foco en escritorio y móvil.

## Evidencia

- `npm run typecheck` y `npm run build` pasaron con Node.js 24.
- `npm test` pasó las siete pruebas unitarias y de integración en PostgreSQL 18 temporal.
- `npm run test:e2e` pasó los tres recorridos en Chromium. Se verificaron el registro, el cierre y el inicio de sesión desde la portada, el cambio de idioma, una portada con la API bloqueada y los cambios de la demo tras recargar.
- La revisión en Chromium comprobó la foto, el acceso por teclado y los enlaces en ES/EN a 320, 390, 570, 768, 1024 y 1440 px. No hubo desbordamiento horizontal ni errores de consola.
- Tras simplificar la cabecera y la tarjeta de ejemplo, volvieron a pasar tipos, compilación y los tres recorridos de Playwright. La prueba bilingüe verificó la cabecera y el título de la tarjeta a 320 px.
- La portada quedó sin la nota debajo de **Probar la demo**. En Chrome, el servidor de desarrollo devolvía 404 en `/hoy`. Tras reiniciar Qualy en el puerto 4317, el botón abrió **Modo demo** y una recarga directa mantuvo la agenda visible.
- En Chrome, los atributos de Grammarly añadidos al `<body>` antes de la hidratación reproducían un aviso de Next.js. Con el ajuste limitado a ese elemento, la reproducción pasó de un aviso a cero. El cambio de idioma, el acceso a la demo, la comprobación de tipos y la compilación pasaron.
- La prueba de cierre de sesión comprobó que, si el servidor confirma la salida, se oculta la vista privada y se abre la portada aunque falle `/api/state`. Si el servidor no confirma la salida, la cuenta sigue visible con un mensaje de error.
- La verificación previa al push pasó con Node.js 24.22.3. Semgrep CE 1.180.0 analizó 67 archivos con cero hallazgos y cero errores. El registro npm no reportó vulnerabilidades conocidas para las 64 dependencias auditadas. Pasaron la comprobación de tipos, la compilación, siete pruebas unitarias y de integración y tres recorridos de navegador.
