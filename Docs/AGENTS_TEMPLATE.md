# AGENTS.md

## Propósito del repositorio
{{project_description}}

## Tech stack
{{#stacks}}
- {{.}}
{{/stacks}}

## Comandos canónicos (source of truth)
- Instalar dependencias: `{{commands.install}}`
- Ejecutar en local: `{{commands.dev}}`
- Lint/format: `{{commands.lint}}` / `{{commands.format}}`
- Tests: `{{commands.test}}`
- Build: `{{commands.build}}`

## Definition of Done
- Ejecutar `{{commands.test}}` y `{{commands.lint}}` antes de dar por finalizado.
- No añadir dependencias nuevas sin confirmación.

## Estilo y convenciones
{{style_notes}}

## Testing guidelines
{{testing_notes}}

## Seguridad
{{security_notes}}