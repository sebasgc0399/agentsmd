# QUALITY Benchmark para AGENTS.md en agents-md

## 1. Objetivo

Definir un benchmark reproducible para medir calidad del `AGENTS.md` generado por `agents-md` y usarlo como gate de regresion en PRs.

Principios:

- Sin dependencias nuevas (solo Node.js + scripts del repo).
- Salida determinista para mismo input.
- Validacion basada en reglas medibles, no en opinion.
- Lenguaje neutral (sin instrucciones tool-specific).

## 2. Rubrica de calidad (11 pts)

Escala por criterio:

- `2`: cumple completo.
- `1`: cumple parcial.
- `0`: no cumple.

Excepcion:

- `Determinismo y estabilidad` usa escala `1/0`.

| Criterio | Definicion operativa | Peso | % del total |
|---|---|---:|---:|
| Claridad y estructura | Tiene secciones minimas, encabezados claros y orden consistente. | 2 | 18.18% |
| Accionabilidad | Las instrucciones son ejecutables y con sintaxis valida. | 2 | 18.18% |
| Exactitud | Comandos/rutas existen en el proyecto o en una allowlist valida. | 2 | 18.18% |
| Concision y densidad | Sin relleno; detalle progresivo por perfil. | 2 | 18.18% |
| Compatibilidad multi-herramienta | No contiene instrucciones dependientes de una herramienta especifica. | 2 | 18.18% |
| Determinismo y estabilidad | Dos corridas iguales producen salida identica. | 1 | 9.09% |

Secciones minimas canonicas para "Claridad y estructura" en benchmark lite:

- `## Proposito del repositorio`
- `## Stack tecnologico`
- `## Comandos canonicos`
- `## Definicion de terminado`
- `## Estilo y convenciones`
- `## Seguridad`

Definicion de lock-in:

- Se considera lock-in cualquier instruccion que dependa de una herramienta concreta.
- Ejemplos bloqueantes: "abre Cursor", "en Claude Code haz X", "usa Windsurf Rules".
- Menciones neutrales de contexto/compatibilidad no cuentan como lock-in.

Formula:

- `score_total = suma de puntos (0..11)`
- `score_pct = (score_total / 11) * 100`

Regla de regresion:

- No se permite una caida mayor a `-1.0` punto contra baseline por fixture/perfil.

## 3. Metricas objetivo por perfil

Basado en limites actuales de `src/render/validators.ts`.

| Metrica | compact | standard | full | Modo |
|---|---:|---:|---:|---|
| Score minimo de rubrica | `>= 7/11` | `>= 8/11` | `>= 9/11` | Gate P0 |
| Lineas objetivo | `30..90` | `130..190` | `200..280` | Warn P0 / Gate P1 opcional |
| Tokens objetivo | `190..700` | `1050..1700` | `1650..2600` | Warn P0 / Gate P1 opcional |
| Tolerancia efectiva (+-10%) | `27..99` lineas / `171..770` tokens | `117..209` lineas / `945..1870` tokens | `180..308` lineas / `1485..2860` tokens | BREACH reportado (P0 no bloqueante) |
| Placeholders bloqueantes (`undefined`, `null`) | `0` | `0` | `0` | Gate P0 |
| Placeholders adicionales (`N/A`, `TBD`) | Warn | Warn | Warn | Warn P0 / Gate P1 opcional |
| Secciones vacias (`##`) | `0` | `0` | `0` | Gate P0 |
| Precision de comandos | `>= 90%` | `>= 95%` | `>= 95%` | Gate P0 |
| Instrucciones tool-specific (lock-in) | `0` | `0` | `0` | Gate P0 |
| Determinismo (hash run1 == run2) | `100% fixtures` | `100% fixtures` | `100% fixtures` | Gate P0 |

## 4. Extraccion de comandos (benchmark)

Regla de extraccion:

- El benchmark busca comandos solo bajo `## Comandos canonicos`.
- Se consideran comandos las lineas de lista con inline code (backticks).
- Bloques de ejemplo fuera de esa seccion no computan para precision.

Regla de validacion:

- Un comando es valido si:
  - coincide con un script real de `package.json` (normalizado por package manager), o
  - pertenece a la allowlist documentada.

Caso sin comandos:

- Si no se detecta ningun comando en `## Comandos canonicos`, falla `Accionabilidad`.

Definicion de precision de comandos:

- Numerador: comandos validos detectados.
- Denominador: total de comandos detectados en `## Comandos canonicos`.

Allowlist inicial (minima):

- `npm install`, `npm ci`
- `pnpm install`, `yarn install`, `bun install`
- `node --version` (solo si se usa como verificacion de runtime)
- `firebase deploy --only functions` (solo para fixtures detectados como Firebase Functions)

## 5. Fixtures para benchmark

Fixtures existentes (hoy):

- `tests/fixtures/react-vite`
- `tests/fixtures/vue-vite`
- `tests/fixtures/runtime-npm`
- `tests/fixtures/firebase-with-functions`
- `tests/fixtures/monorepo-turbo`
- `tests/fixtures/monorepo-pnpm-workspace`

Fixtures target (Issue 7):

- Nuevos fixtures sinteticos para casos edge (sin scripts, monorepo edge, deteccion ambigua).

Perfiles a evaluar por fixture:

- `compact`
- `standard`
- `full`

## 6. Como correr benchmark local (modo lite)

### 6.1 Flujo minimo hoy (sin harness nuevo)

```bash
npm run build
npm test
node dist/cli.js init tests/fixtures/react-vite --dry-run --profile compact
npm run benchmark:limits
```

### 6.2 Flujo recomendado P0 (harness lite)

Objetivo: agregar script `scripts/benchmark/lite.mjs` (Node built-in) para automatizar:

1. Generar salida para cada fixture/perfil.
2. Repetir generacion 2 veces y comparar hash (determinismo).
3. Verificar secciones minimas y placeholders.
4. Verificar precision de comandos contra `package.json`.
5. Calcular score de rubrica y validar umbrales por perfil.
6. Reportar lineas/tokens como warning en P0.

Comando objetivo:

```bash
npm run build
npm run benchmark:lite
```

## 7. CI (modo lite)

Agregar step en `.github/workflows/ci.yml` sin dependencias nuevas:

```yaml
- name: Build
  run: npm run build

- name: Test
  run: npm test

- name: Quality benchmark lite
  run: npm run benchmark:lite
```

Politica de merge:

- Si falla benchmark lite en reglas Gate P0, el PR no mergea.
- Si hay cambios intencionales de templates, se actualiza baseline/snapshot en el mismo PR con justificacion.
- En P0, lineas/tokens no bloquean; solo emiten warning.

## 8. P1 nucleo (baseline semantico + regresion)

Objetivo:

- Versionar un baseline semantico por fixture/perfil.
- Detectar drift semantico no intencional en CI.
- Aplicar presupuesto de regresion de score (`actual >= baseline - 1`).

Comandos P1:

```bash
npm run benchmark:p1
npm run benchmark:p1:update
```

Reglas P1:

- `benchmark:p1` compara la ejecucion actual contra `tests/benchmark/baselines/p1.semantic.json`.
- Si hay drift semantico no aprobado, falla.
- Si el score cae mas de 1 punto vs baseline, falla.
- Si score/precision bajan de umbral de perfil, falla.
- Lineas/tokens se mantienen en modo warning (no gate) en P1.

Politica de baseline:

- Si un cambio de templates/deteccion es intencional, ejecutar `npm run benchmark:p1:update`.
- El diff del baseline debe incluirse en el mismo PR.
- Si el cambio no es intencional, se corrige el codigo y no se actualiza baseline.

## 9. P2 nucleo (tendencias no bloqueantes)

Objetivo:

- Derivar metricas semanales de calidad desde `benchmark:lite` + `benchmark:p1`.
- Enriquecer con conteo de issues etiquetados via GitHub API.
- Mantener P2 como observabilidad (no bloquea merges de PR).

Comando P2:

```bash
npm run benchmark:p2
```

Salida:

- `artifacts/benchmark-p2/report.json`
- `artifacts/benchmark-p2/report.md`

Labels usadas en P2:

- `benchmark:unknown`
- `benchmark:invalid-command`
- `benchmark:regression`

Metricas P2:

- `totalCases`, `passRate`, `determinismRate`
- `avgScore`, `minScore`, `scoreVsBaselineAvg`
- `invalidCommandRate`
- `unknownTokenCaseRate`
- `lineTokenWarningRate` (solo observabilidad)

Alertas P2 (no bloqueantes):

- `determinismRate < 1.0`
- `invalidCommandRate > 0`
- `scoreVsBaselineAvg < 0`
- `p1Status = fail`

Politica CI:

- P2 corre en workflow dedicado semanal/manual (`benchmark-trends.yml`).
- No modifica `ci.yml` de PR; los gates bloqueantes siguen en P0/P1.
- P2 se mantiene no bloqueante para merges (observabilidad operativa).

### 9.1 Runbook P2 (operacion)

Comandos locales recomendados:

```bash
# Operacion local sin llamadas a GitHub Issues
npm run benchmark:p2 -- --no-issues

# Corrida deterministica local para comparacion byte a byte
npm run benchmark:p2 -- --json-only --no-issues --now 2026-02-15T00:00:00.000Z
```

Comando CI/semanal:

```bash
npm run benchmark:p2
```

Lectura minima de reportes:

- `artifacts/benchmark-p2/report.json`: estado estructurado de benchmark/alerts/issues.
- `artifacts/benchmark-p2/report.md`: resumen publicable en `GITHUB_STEP_SUMMARY`.

### 9.2 Matriz de respuesta a alertas P2

| Alert ID | Condicion | Accion recomendada |
|---|---|---|
| `determinism_rate` | `determinismRate < 1.0` | Ejecutar doble corrida en fixtures afectados, identificar orden no estable y corregir en render/deteccion. |
| `invalid_command_rate` | `invalidCommandRate > 0` | Revisar extraccion en `## Comandos canonicos`, validar contra scripts reales y allowlist. |
| `score_vs_baseline` | `scoreVsBaselineAvg < 0` | Comparar contra baseline P1, validar si drift es intencional; corregir o actualizar baseline con justificacion. |
| `p1_status` | `benchmark:p1` en `fail` | Ejecutar `npm run benchmark:p1`, corregir drift/regresion y solo actualizar baseline si el cambio fue intencional. |

## 10. Reporte minimo esperado del benchmark

Salida sugerida por fixture/perfil:

- `score_total` y `score_pct`
- resultado de determinismo (`pass/fail`)
- precision de comandos (`x/y`, `%`)
- warnings de lineas/tokens
- hallazgos bloqueantes (`undefined`, `null`, secciones vacias, lock-in)
