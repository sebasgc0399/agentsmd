# Testing dirigido por riesgo para agents-md

## 1) Objetivo y restricciones de ejecucion

Esta estrategia aplica Risk-Based Testing (RBT) sobre los componentes con mayor impacto funcional:

- `CLI`
- `Detect`
- `Render`
- `Validators`
- `Utils`

Restricciones operativas (bloqueantes):

- Mantener `ESM + TypeScript NodeNext`.
- Mantener salida determinista entre ejecuciones.
- No agregar dependencias nuevas salvo necesidad estricta y justificada en PR.
- No sobrescribir `AGENTS.md` sin `--force`.
- Los e2e del CLI deben usar `--dry-run` y fixtures sinteticos del repo (`tests/fixtures/*`), nunca repos reales.

Baseline de cobertura:

- Fuente de verdad: `coverage/coverage-summary.json` (consultar en cada PR).
- Nota: los porcentajes cambian con frecuencia; este documento evita hardcodear cifras como estado permanente.
- Si se requiere referencia puntual, registrar `snapshot a fecha YYYY-MM-DD`.
- Foco sugerido para analisis de riesgo: `src/detect/framework-detector.ts`, `src/render/data-builder.ts`, `src/render/validators.ts`, `src/utils/fs-utils.ts`, `src/utils/logger.ts`.

## 2) Matriz de riesgos por componente

| Componente | Riesgo principal | Severidad | Probabilidad | Impacto | Senales de regresion | Prueba recomendada |
|---|---|---|---|---|---|---|
| CLI | Parseo de flags invalidas/perfiles no soportados | Alta | Alta | Alta | Exit code incorrecto, errores silenciosos | Unit + smoke compilado (`--dry-run`, perfil invalido, `--out` inseguro) |
| CLI | Manejo incorrecto de `--dry-run` y `--force` | Alta | Media | Alta | Escritura accidental, bloqueo incorrecto | Integration/e2e con fixture temporal y dry-run |
| Detect | Falso positivo de framework | Media | Alta | Alta | Template equivocado | Unit en `framework-detector` y integration Detect->Render |
| Detect | Falso negativo/unknown injustificado | Alta | Media | Alta | Salida generica cuando hay señales claras | Matriz de fixtures sinteticos (known vs unknown) |
| Render | Seleccion de template incorrecta | Alta | Media | Alta | Secciones faltantes o irrelevantes | Unit `selectTemplate` + integration por perfil/framework |
| Render | Bloques no deterministas o inconsistentes por perfil | Media | Media | Alta | Diffs ruidosos entre corridas | Doble corrida y comparacion byte a byte |
| Validators | Clasificacion incorrecta warning vs error | Alta | Media | Alta | Se permite salida invalida o se bloquea de mas | Unit de fronteras (lineas/tokens/placeholders) |
| Validators | Placeholders sin reemplazar (`undefined`, `null`) | Alta | Baja | Alta | AGENTS.md incompleto | Unit + integration en salida renderizada |
| Utils | Seguridad de rutas (`isPathSafe`) incompleta | Alta | Media | Alta | Path traversal o symlink externo permitido | Unit con casos traversal/symlink/prefijos engañosos |
| Utils | Logging/tokens sin cobertura de ramas | Media | Media | Media | Diagnostico pobre o warnings erraticos | Unit `logger` + `token-counter` (texto vs code blocks) |

## 3) Piramide de pruebas propuesta y objetivos por carpeta

Distribucion objetivo:

- Unit: `~70%`
- Integration: `~20%`
- E2E/smoke: `~10%`

| Nivel | Objetivo | Carpetas principales | Resultado esperado |
|---|---|---|---|
| Unit | Cubrir ramas de decision y errores locales | `tests/detect/*`, `tests/render/*`, `tests/utils/*` | Subir branch coverage util (no solo lineas) en funciones criticas |
| Integration | Validar flujo Detect->Render->Validate con fixtures | `tests/render/*` + nuevos tests integrados por fixture/perfil | Confirmar template correcto, placeholders ausentes, salida coherente |
| E2E/smoke | Validar contrato real del binario compilado | `tests/e2e/*` | Exit codes correctos, salida minima estable, sin escritura en dry-run |

Objetivos por carpeta (fase P1):

- `tests/detect`: priorizar rutas de prioridad de framework y monorepo/unknown.
- `tests/render`: priorizar selecciones de template, perfiles y validadores por frontera.
- `tests/utils`: priorizar seguridad de rutas, logger y token counting.
- `tests/e2e`: solo asserts estables del CLI compilado (`status`, fragmentos clave, ausencia de placeholders).

## 4) Estrategia para subir branch coverage util

### 4.1 Ramas objetivo (P0)

- `src/detect/framework-detector.ts`
  - Prioridad de deteccion: `next` sobre `react`.
  - Detecciones via `devDependencies` (`nuxt`, `svelte`, `firebase-functions`).
  - Rama `unknown` sin dependencias reconocibles.
- `src/render/data-builder.ts`
  - Defaults cuando falta descripcion/scripts.
  - Flags `has_*` por comando disponible/no disponible.
  - Bloque `is_unknown_generic` y perfiles (`compact|standard|full`).
- `src/render/validators.ts`
  - Fronteras por perfil: lineas bajas/altas.
  - Errores por placeholders (`undefined`, `null`).
  - Secciones `##` vacias vs cuerpo con contenido real.
- `src/utils/logger.ts`
  - Ramas verbose on/off para `verbose` y `debug`.
- `src/utils/fs-utils.ts`
  - Traversal `../`, prefijo enganoso, symlink interno/externo, metadata no legible.

Symlinks en Windows:

- Los tests de symlink pueden depender de permisos o Developer Mode.
- Siempre cubrir traversal (`../`) y paths absolutos fuera de raiz.
- Ejecutar casos de symlink solo cuando el entorno lo soporte (skip condicional).

### 4.2 Ramas objetivo (P1)

- `src/detect/index.ts`: `applyFolderSignals` (firebase sin `functions/` => unknown).
- `src/detect/command-detector.ts`: prioridades de scripts y variaciones por package manager.
- `src/render/mustache-renderer.ts`: template faltante y fallbacks de seleccion.
- Flujos de error end-to-end: perfil invalido, path inseguro, fixture inexistente.

### 4.3 Criterio de calidad de cobertura

Subir coverage por ramas en codigo de decision real, no por volumen de asserts:

- P0: targets por archivo como objetivo interno (no gate duro de CI).
- P1: gates por carpeta (CI bloqueante):
  - `src/detect/* >= 85%` branches.
  - `src/render/* >= 85%` branches.
  - `src/utils/* >= 80%` branches.

## 5) Smoke tests del CLI compilado

Comandos base (sobre binario compilado):

```bash
npm run build
node dist/cli.js --help
node dist/cli.js init --help
node dist/cli.js --version
node dist/cli.js init tests/fixtures/react-vite --dry-run --profile compact
node dist/cli.js init tests/fixtures/runtime-npm --dry-run --profile compact
node dist/cli.js init tests/fixtures/react-vite --dry-run --profile invalid
node dist/cli.js init tests/fixtures/react-vite --dry-run --out ../AGENTS.md
```

Asserts estables recomendados (sin snapshots gigantes):

- `--help`: exit code `0` y contiene el comando `init`.
- `init --help`: exit code `0` y contiene `--dry-run`, `--profile`, `--force`, `--out`.
- `--version`: exit code `0` y matchea `^v?\d+\.\d+\.\d+`.
- `init ... --dry-run --profile compact`: exit code `0`, contiene `# AGENTS`, contiene `## Comandos`, no contiene `undefined`, no contiene `null`, no contiene `{{`.
- `--profile invalid`: exit code `!= 0` y contiene `Invalid profile`.
- `--out ../AGENTS.md`: exit code `!= 0` y contiene `Output path must be within the project directory`.

## 6) Que NO testear (anti-patterns)

- No usar snapshots completos de `AGENTS.md` (fragiles y poco diagnosticos).
- No assertar el markdown completo literal; validar solo invariantes funcionales.
- No testear internals de librerias externas (`commander`, `mustache`) como objetivo principal.
- No usar repos reales, red, reloj o rutas del sistema host para e2e.
- No inflar cobertura con tests duplicados de happy path sin nuevas ramas.
- No acoplar asserts a ordenes no normalizados del filesystem.

## 7) Plan por fases P0/P1/P2 (DoD y metricas)

| Fase | Ventana | Foco | DoD | Metricas |
|---|---|---|---|---|
| P0 | 1-2 semanas | Quick wins en rutas criticas y errores | Smoke CLI compilado + cobertura en rutas criticas de detect/render/validators/utils | Metas internas por archivo reportadas sin bloqueo; e2e dry-run estable |
| P1 | 2-4 semanas | Matriz de fixtures e integracion robusta | Flujo Detect->Render->Validate validado por fixture/perfil con asserts estructurales | `src/detect/*` y `src/render/*` >= `85%` branches; `src/utils/*` >= `80%`; determinismo `run1==run2` en matriz |
| P2 | 4-6 semanas | Hardening y prevencion de regresiones | Gates estables + edge cases de largo plazo sin deuda de tests fragiles | Branch global >= `88-90%`; 0 placeholders en smoke suite; regresiones criticas detectadas en PR |

## 8) Backlog ejecutable: issues propuestas

### P0 (quick wins)

#### Issue P0-1: CLI smoke compilado y codigos de salida basicos

- Contexto: falta consolidar contrato CLI compilado con asserts estables por comando.
- Alcance minimo:
  - Extender `tests/e2e/cli-init.test.ts` con `--help`, `--version`, `init --dry-run --profile compact`.
  - Agregar negativos de `--profile invalid` y `--out ../AGENTS.md` en dry-run.
- DoD:
  - Todos los comandos anteriores con asserts de exit code y fragmentos estables.
  - Sin snapshots completos de salida.
- Tests esperados:
  - `status === 0` en casos validos.
  - `status !== 0` en casos invalidos.
  - Ausencia de `undefined|null|{{` en preview dry-run.
- Comandos de verificacion:
  - `npm run build`
  - `npm test`
  - `node dist/cli.js init tests/fixtures/react-vite --dry-run --profile compact`

#### Issue P0-2: Detect - cerrar ramas de prioridad de framework

- Contexto: `framework-detector` es el punto mas bajo de branches en detect.
- Alcance minimo:
  - Casos para `next > react`, `nuxt` desde `devDependencies`, `svelte`, `firebase-functions`, `unknown`.
  - Cubrir prioridad y confianza esperada en cada caso.
- DoD:
  - `src/detect/framework-detector.ts` >= `75%` branches.
  - Todos los casos de prioridad criticos documentados en tests.
- Tests esperados:
  - Unit tests de `detectFramework` y `detectBuildTools`.
  - Caso negativo sin dependencias reconocibles.
- Comandos de verificacion:
  - `npm run build`
  - `npm test`
  - `node dist/cli.js init tests/fixtures/vue-vite --dry-run --profile compact`

#### Issue P0-3: Render/Validators - fronteras y errores bloqueantes

- Contexto: ramas de `data-builder` y `validators` cubren menos que el objetivo P0.
- Alcance minimo:
  - Fronteras de lineas/tokens por perfil.
  - Errores por `undefined/null`.
  - Secciones `##` vacias vs no vacias.
  - Defaults de `data-builder` cuando faltan scripts o descripcion.
- DoD:
  - `src/render/validators.ts` >= `80%` branches.
  - `src/render/data-builder.ts` >= `80%` branches.
- Tests esperados:
  - Unit tests de `validateOutput` con limites y placeholders.
  - Integration corta `detectProject -> renderAgentsMd` con fixture unknown.
- Comandos de verificacion:
  - `npm run build`
  - `npm test`
  - `node dist/cli.js init tests/fixtures/runtime-npm --dry-run --profile compact`

#### Issue P0-4: Utils - logger y token-counter con cobertura util

- Contexto: `logger.ts` no tiene cobertura y `token-counter` cubre parcialmente comportamientos.
- Alcance minimo:
  - Tests para `verbose`/`debug` en modo verbose on/off.
  - Tests de estimacion de tokens con y sin bloques de codigo.
- DoD:
  - `src/utils/logger.ts` deja de estar en `0%` y alcanza cobertura funcional.
  - `token-counter` valida escenarios mixtos texto+codigo.
- Tests esperados:
  - Unit tests aislados con spies de consola.
  - Casos de `estimateTokens` y `validateTokenCount`.
- Comandos de verificacion:
  - `npm run build`
  - `npm test`
  - `(si aplica) node dist/cli.js init tests/fixtures/react-vite --dry-run --profile compact`

#### Issue P0-5: Seguimiento de cobertura por ramas en carpetas criticas

- Contexto: la cobertura global oculta deficits en archivos clave de decision.
- Alcance minimo:
  - Implementar `scripts/coverage/p0-report.mjs` para reportar coverage de ramas por carpeta y por target P0.
  - Agregar script npm `coverage:p0:report`.
  - Publicar reporte visible en PR como `GITHUB_STEP_SUMMARY` + artifact JSON/MD.
- DoD:
  - El PR reporta desvios de metas P0 como `WARN` sin bloqueo.
  - Targets y excepciones documentadas en `Docs/TEST_STRATEGY.md`.
- Tests esperados:
  - Test e2e del script con coverage real/sintetica y salida de reportes.
  - Corrida negativa en `--strict` simulando regresion de branches.
  - Test de normalizacion de paths Windows/Linux.
- Comandos de verificacion:
  - `npm run build`
  - `npm test`
  - `npm run coverage:p0:report`
  - `(si aplica) node dist/cli.js init tests/fixtures/react-vite --dry-run --profile compact`

### P1 (consolidacion)

#### Issue P1-1: Integracion Detect->Render->Validate con matriz de fixtures

- Contexto: falta consolidar un flujo integrado por fixture/perfil con asserts estructurales.
- Alcance minimo:
  - Suite integrada sobre matriz sintetica (known, unknown, monorepo, firebase).
  - Validar template, placeholders y estructura minima por perfil.
- DoD:
  - Matriz minima P1 ejecutada en CI.
  - Cero dependencias en repos reales.
- Tests esperados:
  - Integration tests por perfil `compact|standard|full`.
  - Assert de `validation.errors.length === 0`.
- Comandos de verificacion:
  - `npm run build`
  - `npm test`
  - `node dist/cli.js init tests/fixtures/monorepo-turbo --dry-run --profile compact`

#### Issue P1-2: Expandir matriz de fixtures sinteticos edge

- Contexto: faltan edge cases para deteccion ambigua y scripts incompletos.
- Alcance minimo:
  - Agregar fixtures sinteticos para:
    - deteccion ambigua,
    - sin scripts,
    - monorepo con marcadores parciales,
    - runtime/package manager alterno.
- DoD:
  - Nuevos fixtures versionados en `tests/fixtures/*`.
  - Todo el suite actual permanece verde.
- Tests esperados:
  - Tests detect/render que consuman cada fixture nuevo.
  - Verificacion de rama `unknown` justificada.
- Comandos de verificacion:
  - `npm run build`
  - `npm test`
  - `node dist/cli.js init tests/fixtures/monorepo-pnpm-workspace --dry-run --profile compact`

#### Issue P1-3: Determinismo fuerte por doble corrida

- Contexto: el output debe ser byte a byte estable entre corridas.
- Alcance minimo:
  - Test e2e que ejecute 2 veces `init --dry-run` por fixture/perfil y compare preview.
  - Cobertura de al menos una muestra por `compact`, `standard`, `full`.
- DoD:
  - `run1 === run2` para toda la matriz P1 definida.
  - Sin dependencias de timezone/locale.
- Tests esperados:
  - Test dedicado `deterministic-output`.
  - Caso de regresion documentado para orden inestable.
- Comandos de verificacion:
  - `npm run build`
  - `npm test`
  - `node dist/cli.js init tests/fixtures/react-vite --dry-run --profile compact`

#### Issue P1-4: Hardening de rutas negativas CLI + seguridad de path

- Contexto: el flujo de errores del CLI debe mantenerse estable y seguro.
- Alcance minimo:
  - Completar matriz de errores: path inexistente, path inseguro, archivo existente sin `--force`, perfil invalido.
  - Confirmar mensajes de error utiles y exit code no-cero.
- DoD:
  - Casos negativos cubiertos en unit/e2e.
  - Ningun caso escribe `AGENTS.md` en `--dry-run`.
- Tests esperados:
  - E2E con fixtures sinteticos y directorios temporales.
  - Unit en helpers de path seguro cuando aplique.
- Comandos de verificacion:
  - `npm run build`
  - `npm test`
  - `node dist/cli.js init tests/fixtures/react-vite --dry-run --profile compact`

#### Issue P1-5: Consolidar objetivos de branch coverage en carpetas criticas

- Contexto: se necesita pasar de quick wins a objetivos sostenibles por carpeta.
- Alcance minimo:
  - Ajustar thresholds para reflejar P1:
    - `src/detect/* >= 85% branches`
    - `src/render/* >= 85% branches`
    - `src/utils/* >= 80% branches`
  - Documentar excepciones temporales con fecha de cierre.
- DoD:
  - Thresholds activos en CI.
  - Reporte de cobertura por carpeta visible en PR.
- Tests esperados:
  - Validacion de thresholds con corrida normal.
  - Validacion de fallo controlado ante regresion.
- Comandos de verificacion:
  - `npm run build`
  - `npm test`
  - `(si aplica) node dist/cli.js init tests/fixtures/react-vite --dry-run --profile compact`
