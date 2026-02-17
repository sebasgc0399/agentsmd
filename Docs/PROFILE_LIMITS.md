# PROFILE_LIMITS

## Definición formal de perfiles

### compact
- Objetivo: accion inmediata con lectura rapida.
- Audiencia: ejecucion de tareas cortas y cambios acotados.
- Contenido core: proposito, stack, comandos canonicos, DoD, estilo base, seguridad.

### standard
- Objetivo: balance entre claridad, completitud y costo.
- Audiencia: handoff entre miembros del equipo y tareas multi-archivo.
- Contenido core: compact + protocolos operativos y checklist ampliado.

### full
- Objetivo: guia exhaustiva para cambios complejos, QA y CI.
- Audiencia: tareas de alto riesgo, debugging profundo y handoff detallado.
- Contenido core: standard + protocolos avanzados, matrices de verificacion y rollback.

## Límites recomendados y tolerancias

Rangos base por perfil (soft limits):

- compact: `190-700` tokens, `30-90` lineas.
- standard: `1050-1700` tokens, `130-190` lineas.
- full: `1650-2600` tokens, `200-280` lineas.

Tolerancia:

- `+-10%` sobre cada borde del rango.
- Rango tolerado efectivo:
  - compact: `171-770` tokens, `27-99` lineas.
  - standard: `945-1870` tokens, `117-209` lineas.
  - full: `1485-2860` tokens, `180-308` lineas.

Politica de severidad:

- fuera de rango base: `warning`.
- fuera de tolerancia: `breach` reportado (`[BREACH]`), no bloqueante en P0.
- P1 puede evaluar breach como gate solo con baseline estable y aprobado.

## Reglas de progressive disclosure

### Secciones always-on (semántica obligatoria)
Estas secciones deben existir siempre y en forma canonica en espanol para benchmark:

- `## Proposito del repositorio`.
- `## Stack tecnologico`.
- `## Comandos canonicos`.
- `## Definicion de terminado`.
- `## Estilo y convenciones`.
- `## Seguridad`.

### Secciones condicionales por stack
- Monorepo (`is_monorepo`): `## Estructura del monorepo`, `## Build y despliegue`.
- Firebase Functions (`framework_type` con valor `firebase-functions`): `## Variables de entorno`, `## Despliegue`.
- Testing (`has_tests`): `## Guia de pruebas`.
- Generic unknown no-monorepo (`is_unknown_generic`): `## Guia de ejecucion para proyectos genericos`.

Nota: los nombres exactos de flags y propiedades de contexto deben corresponder a `src/render/data-builder.ts`.

### Secciones solo-full
- `## Protocolo avanzado para agentes`
- Matriz de verificacion por capa.
- Guia de rollback.
- Auditoria post-merge.
- Plantillas de incidente/handoff extendidas.

## Método de medición reproducible

### token-counter vs token real

Importante:

- El validador del CLI usa `estimatedTokens` (estimacion determinista) para warnings y breach.
- `realTokens` se usa solo para calibracion dev-only en `benchmark:limits`; no afecta runtime del CLI.

- Estimador interno: `estimatedTokens` desde `src/utils/token-counter.ts`.
- Conteo real: `js-tiktoken` con:
  - `cl100k_base`
  - `o200k_base`
- Comparativa por caso:
  - `delta = estimatedTokens - realTokens`
  - `absPctError = abs(delta) / realTokens * 100`

### dataset / fixtures

Dataset minimo P0:

- `tests/fixtures/react-vite`
- `tests/fixtures/vue-vite`
- `tests/fixtures/runtime-npm`
- `tests/fixtures/firebase-with-functions`
- `tests/fixtures/monorepo-turbo`
- `tests/fixtures/monorepo-pnpm-workspace`

Perfiles evaluados por fixture: `compact`, `standard`, `full`.

### scripts y ejecución

Script dev-only:

- `scripts/benchmark/profile-limits.mjs`
- npm script: `npm run benchmark:limits`

Salidas:

- `artifacts/profile-limits/baseline.json`
- `artifacts/profile-limits/baseline.md`

### Baselines/artifacts (política)

- `artifacts/profile-limits/*` se versiona en git como baseline canonico.
- Actualizar baseline requiere justificar el cambio en PR y actualizar tests/documentacion relacionada.
- Mantener esta politica evita drift silencioso y mantiene comparabilidad historica entre PRs.

Metricas reportadas:

- error porcentual medio por encoding.
- p50 y p95 del error porcentual.
- desviacion (delta) por perfil y por fixture.
- distribucion de lineas/tokens estimados por perfil.

## Política de cambios

1. Cambiar limites requiere:
- baseline nuevo en `artifacts/profile-limits/*`.
- explicacion del gap entre estimador y token real.
- tests actualizados de fronteras/rangos.

2. Alcance por fase:
- P0: calibrar validadores y medicion, sin refactor de estructura en templates.
- P1: refactor minimo de disclosure solo si el baseline muestra gap estructural.

3. Compatibilidad:
- no cambiar contrato CLI: `init`, `--profile`, `--dry-run`.
- no cambiar semantica por defecto de `compact`.
- el profile por defecto del CLI permanece `compact` (backward-compatible).
- mantener `ESM/NodeNext` y salida determinista.

## Backlog ejecutable (Issues P0/P1)

### Issue P0-1

Titulo: `benchmark: medición reproducible de tokens reales y baseline por fixture/perfil`

Contexto:
- hoy existe estimacion heuristica, sin comparacion sistematica contra tokenizadores reales.

Alcance minimo:
- agregar `scripts/benchmark/profile-limits.mjs`.
- agregar script npm `benchmark:limits`.
- soportar `cl100k_base` y `o200k_base`.
- generar reporte JSON/MD en `artifacts/profile-limits/`.

DoD:
- reporte para `6 fixtures x 3 perfiles`.
- error estimador-vs-real calculado por perfil y encoding.
- salida determinista entre dos corridas.
- sin impacto runtime del CLI.

Tests esperados:
- e2e del script con salida valida.
- test de encoding invalido.
- test de consistencia de metricas agregadas.

Comandos de verificación:
- `npm run build`
- `npm test`
- `node dist/cli.js init tests/fixtures/react-vite --dry-run --profile compact`
- `npm run benchmark:lite`
- `npm run benchmark:limits`

### Issue P0-2

Titulo: `validators: recalibrar límites por perfil usando baseline real (sin cambiar templates)`

Contexto:
- existen desviaciones por minimos de lineas y posible sesgo entre estimador y token real.

Alcance minimo:
- ajustar rangos/tolerancias en `src/render/validators.ts`.
- actualizar tests de fronteras.
- mantener estructura actual de templates.

DoD:
- limites documentados y aplicados en validacion.
- warnings alineados con baseline real.
- sin regresiones de determinismo ni placeholders bloqueantes.
- sin cambios estructurales en `.mustache`.

Tests esperados:
- actualizar `tests/render/validators.test.ts`.
- actualizar `tests/render/profile-renderer.test.ts`.
- mantener `benchmark:lite` y `benchmark:p1` en verde.

Comandos de verificación:
- `npm run build`
- `npm test`
- `node dist/cli.js init tests/fixtures/runtime-npm --dry-run --profile compact`
- `npm run benchmark:lite`
- `npm run benchmark:limits`

### Issue P1-1

Titulo: `templates: refactor mínimo para progressive disclosure por perfil/stack (si aplica)`

Contexto:
- ejecutar solo si P0 confirma gap estructural no resoluble con calibracion de limites.

Alcance minimo:
- mover contenido no-core a bloques condicionales o solo-full en:
  - `src/templates/base.mustache`
  - `src/templates/react.mustache`
  - `src/templates/firebase.mustache`
  - `src/templates/monorepo.mustache`
- sin rediseño mayor.

DoD:
- reglas `always-on / condicional / solo-full` implementadas.
- sin lock-in tool-specific.
- mejor alineacion por perfil con limites.
- compatibilidad con baseline semantico P1.

Tests esperados:
- presencia/ausencia por perfil+stack.
- determinismo byte a byte.
- update controlado de baseline P1 solo en cambios intencionales.

Comandos de verificación:
- `npm run build`
- `npm test`
- `node dist/cli.js init tests/fixtures/monorepo-turbo --dry-run --profile compact`
- `npm run benchmark:lite`
- `npm run benchmark:p1`
- `npm run benchmark:limits`
