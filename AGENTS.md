# Instrucciones del repositorio

Lee [la constitución de Qualy](constitution.md) antes de preparar especificaciones, planes o cambios de producto. Para cada funcionalidad, consulta `specs/<funcionalidad>/spec.md`, `plan.md` y `tasks.md` en ese orden. Si faltan, prepara la especificación con criterios de aceptación, valida el alcance con la persona responsable y documenta el plan y las tareas antes de implementar. Registra la evidencia de verificación en las tareas. Si una especificación entra en conflicto con la constitución, identifica el conflicto antes de implementar y valida cualquier cambio a la constitución.

## Subagentes

Delega según el tipo de tarea. Todos los perfiles usan esfuerzo de razonamiento `high`.

| Tarea | Perfil | Modelo |
| --- | --- | --- |
| Escribir código | [`implementation`](.codex/agents/implementation.toml) | `gpt-6.2-sol` |
| Diseñar arquitectura y revisar escalabilidad, stack y seguridad | [`architecture`](.codex/agents/architecture.toml) | `gpt-6.2-sol` |
| Probar funcionalidades en el navegador | [`browser_qa`](.codex/agents/browser-qa.toml) | `gpt-6.1-terra` |
| Leer carpetas y extraer información | [`repository_research`](.codex/agents/repository-research.toml) | `gpt-6-luna` |

Activa `browser_qa` cuando el usuario diga «probemos funcionalidad como un humano» o haga una petición equivalente. Pásale la funcionalidad, los criterios de aceptación aplicables y la pestaña, navegador o URL indicados. Espera su resultado y registra la evidencia en `tasks.md` cuando haya una especificación asociada.

Si la herramienta no permite seleccionar un perfil por nombre, usa el modelo y el esfuerzo de razonamiento que figuran en su archivo e incluye sus instrucciones junto al encargo. Si el modelo solicitado está ausente del catálogo de la sesión, informa al usuario antes de sustituirlo.

<!-- context7 -->
Usa Context7 para consultar documentación vigente sobre bibliotecas, frameworks, SDK, API, CLI y servicios en la nube. Incluye sintaxis, configuración, migraciones, errores específicos y uso de CLI. Para refactorizaciones, scripts propios, lógica de negocio, revisiones de código y conceptos generales, trabaja con el código y el contexto del repositorio.

1. Llama a `resolve-library-id` con el nombre y la consulta, salvo que se proporcione un ID exacto con formato `/org/project`.
2. Selecciona el resultado por coincidencia del nombre, relevancia, cobertura de ejemplos, reputación y puntuación. Si se indicó una versión, usa el ID correspondiente cuando esté disponible.
3. Llama a `query-docs` con una pregunta concreta por tema, salvo que la consulta sea sobre cómo interactúan los temas. Usa la documentación obtenida en la respuesta.
<!-- context7 -->
