# AGENTS Research Roadmap for agents-md

## 1) Decision de ejecucion

Se adoptan dos lineas complementarias de ejecucion para calidad de release:

- **Opcion 1 (activa):** Benchmark de calidad de `AGENTS.md` como gate principal.
- **Opcion 2 (nueva linea ejecutable):** Testing dirigido por riesgo para endurecer `CLI`, `detect`, `render`, `validators` y `utils`.

Decision concreta:

- Opcion 1:
  - `P0`: quick wins obligatorios (determinismo + benchmark lite + gate en CI).
  - `P1`: consolidar score automatico, snapshots y checks semanticos.
  - `P2`: seguimiento no bloqueante con metricas derivadas del benchmark + issues etiquetados via GitHub API.
- Opcion 2:
  - `P0`: cubrir rutas criticas y errores (incluye smoke e2e CLI compilado en `--dry-run`).
  - `P1`: consolidar matriz de fixtures + edge cases y elevar branch coverage util en carpetas criticas.
  - `P2`: hardening de largo plazo y estabilizacion de gates por carpeta.

## 2) Baseline tecnico (estado actual)

Evidencia local:

- Cobertura actual: consultar `coverage/coverage-summary.json` en cada PR.
- Evitar cifras hardcodeadas como estado permanente; usar snapshots fechados cuando aplique.
- Punto principal de seguimiento: `src/utils/logger.ts` sin cobertura directa dedicada.
- CLI ya protege sobreescritura: no escribe si existe archivo sin `--force`.
- CLI ya soporta `--dry-run`, util para benchmark determinista.
- Proyecto compila en `ESM/NodeNext` (`tsconfig.json`).

## 3) Plan por fases

| Fase | Ventana | Objetivo | Entregables minimos |
|---|---|---|---|
| P0 | 1-2 semanas | Tener benchmark lite ejecutable en local y CI | rubrica versionada, harness lite sin deps nuevas, chequeo determinismo, chequeo exactitud de comandos, job CI bloqueante |
| P1 | 2-4 semanas | Hacer robusta la evaluacion de calidad | snapshots por fixture/perfil, validacion semantica markdown, score automatico por criterio, expansion de fixtures |
| P2 | 4-8 semanas | Medir tendencia de calidad sin telemetria de usuarios | script `benchmark:p2`, reportes semanales CI (md/json), metricas derivadas de benchmark e issues etiquetados, alerts no bloqueantes |

### 3.1) Opcion 2 (Testing dirigido por riesgo) - linea ejecutable

Documento de referencia: [`Docs/TEST_STRATEGY.md`](./TEST_STRATEGY.md).

| Fase | Ventana | Plan ejecutable | Criterios medibles |
|---|---|---|---|
| P0 | 1-2 semanas | Quick wins en rutas criticas (`CLI`, `detect`, `render`, `validators`, `utils`) + smoke e2e del CLI compilado | Metas internas por archivo (sin gate bloqueante): `src/detect/framework-detector.ts >= 75%`, `src/render/data-builder.ts >= 80%`, `src/render/validators.ts >= 80%`, `src/utils/logger.ts` deja `0%`; smoke `--help`, `init --help`, `--version`, `init --dry-run` verde; reporte `coverage:p0:report` visible en CI (summary + artifact) |
| P1 | 2-4 semanas | Consolidar matriz de fixtures sinteticos y casos edge con flujo Detect->Render->Validate | Gates por carpeta (bloqueantes): `src/detect/* >= 85%` branches, `src/render/* >= 85%`, `src/utils/* >= 80%`; determinismo `run1 == run2` en matriz; `0` placeholders bloqueantes (`undefined`, `null`) |

## 4) Matriz de fixtures (P0 vs target)

Matriz lite P0 (usar fixtures existentes en `tests/fixtures/*`):

- `tests/fixtures/react-vite`
- `tests/fixtures/vue-vite`
- `tests/fixtures/runtime-npm`
- `tests/fixtures/firebase-with-functions`
- `tests/fixtures/monorepo-turbo`
- `tests/fixtures/monorepo-pnpm-workspace`

Target de expansion (Issue 7):

- Fixtures sinteticos para casos edge (sin scripts, monorepo edge, deteccion ambigua).

## 5) Criterios de aceptacion medibles

### P0 (gate minimo)

- Existe `Docs/QUALITY_BENCHMARK.md` con rubrica y umbrales por perfil.
- Benchmark lite ejecuta matriz minima: `6 fixtures x 3 perfiles`.
- Determinismo: `run1 == run2` en `100%` de casos.
- Exactitud de comandos:
  - `compact >= 90%`
  - `standard >= 95%`
  - `full >= 95%`
- Cero placeholders bloqueantes (`undefined`, `null`) en salida final.
- Cero secciones vacias en encabezados `##`.
- Cero instrucciones tool-specific (lock-in).
- Lineas/tokens se reportan como `WARN` en P0 (no bloquean).
- CI falla si benchmark lite falla en reglas gate de P0.

### P1 (robustez)

- Se guardan referencias por fixture/perfil y se validan en CI.
- Score minimo de rubrica por perfil:
  - `compact >= 7/11`
  - `standard >= 8/11`
  - `full >= 9/11`
- Tolerancia de regresion: no peor que `-1.0` punto vs baseline.
- Lineas/tokens pueden pasar de warn a gate (solo con baseline estable).
- Al menos `80%` de cobertura de ramas en `src/render/*` y `src/detect/*`.

### P2 (impacto y seguimiento)

- Tasa de casos `unknown` en fixtures actuales estable o descendente.
- Tasa de comandos invalidos detectados por benchmark estable o descendente.
- Tendencia de score estable o creciente en `>= 4` semanas consecutivas.
- Reporte semanal en markdown/json generado por CI (sin datos de usuarios).
- Tendencia de issues por labels:
  - `benchmark:unknown`
  - `benchmark:invalid-command`
  - `benchmark:regression`

## 6) Plan minimo de implementacion (sin dependencias nuevas)

### CLI

- Mantener contrato actual:
  - no sobreescribir archivo existente sin `--force`,
  - soportar `--dry-run` como salida de benchmark,
  - errores claros y codigo de salida no-cero en fallos.
- Agregar pruebas para rutas de error y comportamiento determinista por perfil.

### Templates y render

- Eliminar cualquier contenido dinamico no determinista (timestamps, ids, orden variable).
- Forzar orden estable en listas renderizadas (si se agregan nuevas fuentes de datos).
- Evitar instrucciones tool-specific (lock-in) en el output.

### Tests y harness

- Implementar runner `scripts/benchmark/lite.mjs` usando solo Node built-in (`fs`, `path`, `child_process`, `assert`).
- Checks minimos:
  - presencia de secciones minimas,
  - ausencia de placeholders bloqueantes y secciones vacias,
  - exactitud de comandos contra `package.json` + allowlist,
  - determinismo por doble corrida.
- Definir extraccion formal de comandos desde `## Comandos canonicos`.
- Regla para `0 comandos detectados`: falla `Accionabilidad`.

### Compatibilidad requerida

- Mantener compatibilidad `ESM/NodeNext` (imports `.js` en codigo TS compilado).
- Mantener output determinista en Windows y Linux.
- Mantener seguridad de escritura de archivos (`--force` obligatorio para overwrite).

## 7) Backlog ejecutable (issues propuestos)

### Issue 1 - benchmark: crear harness lite sin dependencias nuevas

- Contexto: falta benchmark automatizado por fixture/perfil.
- Alcance minimo: crear `scripts/benchmark/lite.mjs` con score y reglas gate P0.
- DoD:
  - genera reporte por fixture/perfil,
  - devuelve exit code `1` si no cumple gate P0,
  - corre en Node 18+ sin deps nuevas.
- Tests esperados:
  - test de runner con fixture controlado,
  - test de fallo por placeholder bloqueante,
  - test de fallo por score bajo.

### Issue 2 - ci: integrar benchmark lite como gate en PR

- Contexto: hoy CI no bloquea por calidad documental del AGENTS generado.
- Alcance minimo: agregar step `Quality benchmark lite` en `.github/workflows/ci.yml`.
- DoD:
  - benchmark corre en `ubuntu-latest` y `windows-latest`,
  - merge bloqueado si falla benchmark.
- Tests esperados:
  - corrida CI verde con estado actual,
  - prueba negativa (fixture roto) que fuerce rojo.

### Issue 3 - tests/e2e: asegurar determinismo por fixture y perfil

- Contexto: determinismo definido pero no cubierto exhaustivamente en e2e.
- Alcance minimo: doble corrida por fixture/perfil y comparacion byte a byte.
- DoD:
  - determinismo validado para matriz lite completa.
- Tests esperados:
  - nuevo test e2e `deterministic-output`,
  - test de regresion cuando cambia orden de secciones.

### Issue 4 - quality: validar exactitud de comandos contra package.json

- Contexto: exactitud de comandos es criterio central.
- Alcance minimo: parser de `## Comandos canonicos` + validacion scripts/allowlist.
- DoD:
  - precision calculada en benchmark,
  - equivalencias npm/pnpm/yarn/bun documentadas,
  - regla definida para `0 comandos`.
- Tests esperados:
  - caso positivo con scripts validos,
  - caso negativo con comando inventado,
  - caso con `0 comandos` que falla Accionabilidad.

### Issue 5 - templates: hardening de neutralidad y concision

- Contexto: riesgo de lock-in y contenido redundante.
- Alcance minimo: revisar templates para lenguaje neutral y progressive disclosure por perfil.
- DoD:
  - cero instrucciones tool-specific en output generado,
  - bloques por perfil mantienen limites de lineas/tokens.
- Tests esperados:
  - test de regex anti-lock-in,
  - test de limites por perfil.

### Issue 6 - tests: snapshots semanticos por fixture/perfil

- Contexto: faltan referencias integrales controladas.
- Alcance minimo: snapshots semanticos (estructura markdown) para fixtures principales.
- DoD:
  - snapshots versionados,
  - script de update controlado,
  - CI detecta cambios no intencionales.
- Tests esperados:
  - comparacion semantica estable,
  - diff claro cuando cambia template.

### Issue 7 - detect: ampliar fixtures para cobertura de stacks objetivo

- Contexto: la matriz actual no cubre todos los edge cases.
- Alcance minimo: agregar fixtures sinteticos para frameworks/casos limite.
- DoD:
  - al menos 5 fixtures nuevos (incluyendo sin scripts y monorepo edge),
  - benchmark lite y tests existentes siguen verdes.
- Tests esperados:
  - tests unitarios de deteccion por nuevo fixture,
  - test de no-regresion en perfiles.

### Issue 8 - observabilidad: metricas derivadas sin telemetria de usuarios

- Contexto: P2 necesita tendencia objetiva sin recopilar datos de uso privado.
- Alcance minimo: `benchmark:p2` + workflow semanal/manual con reporte de tendencias desde benchmark + issues etiquetados.
- DoD:
  - genera `artifacts/benchmark-p2/report.json` y `report.md`,
  - workflow `benchmark-trends.yml` publica artifacts y summary,
  - P2 no bloquea merges de PR.
- Tests esperados:
  - test de agregacion de metricas,
  - test de export con formato estable,
  - test de modo `--no-issues` para entorno local.

## 8) Comandos de verificacion obligatoria

Para cambios de documentacion:

```bash
npm test
npm run build
```

Para cambios de benchmark/harness (cuando exista):

```bash
npm run benchmark:lite
npm run benchmark:p1
npm run benchmark:p2
```

## 9) Estado operativo P0 (branch actual)

- [x] Harness `scripts/benchmark/lite.mjs` implementado.
- [x] Script npm `benchmark:lite` disponible.
- [x] Gate CI agregado en Ubuntu y Windows.
- [x] Tests iniciales del harness agregados.

## 10) Estado operativo P1 nucleo (branch actual)

- [x] Baseline semantico versionado (`tests/benchmark/baselines/p1.semantic.json`).
- [x] Verificador P1 (`scripts/benchmark/p1.mjs`) con modo check/update.
- [x] Gate CI `npm run benchmark:p1` agregado.
- [x] Presupuesto de regresion activado (`score actual >= baseline - 1`).
- [x] Lineas/tokens se mantienen como warning no bloqueante.

## 11) Estado operativo P2 nucleo (branch actual)

- [x] Script `scripts/benchmark/p2.mjs` implementado (JSON + Markdown).
- [x] Script npm `benchmark:p2` disponible.
- [x] Workflow semanal/manual `.github/workflows/benchmark-trends.yml` agregado.
- [x] Reportes P2 publicados como artifacts (`artifacts/benchmark-p2/*`).
- [x] P2 mantiene politica no bloqueante para PRs.
