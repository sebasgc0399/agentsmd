# Contrato de Deteccion de Frameworks (P0 cerrado + P1 ejecucion)

## Proposito
Este documento es la fuente unica de verdad para el comportamiento de deteccion de frameworks en `agents-md`.

Objetivos:
- Deteccion determinista desde `package.json` + `existsSync` en rutas conocidas.
- Clasificacion precision-first (`unknown` cuando la evidencia no alcanza).
- Guardas anti-falsos-positivos fuertes para frameworks nuevos P0:
  `angular`, `sveltekit`, `astro`, `nestjs`.
- Compatibilidad retroactiva para fixtures existentes (`framework.type` no cambia).

## Entradas permitidas y determinismo

### Entradas permitidas
- `package.json`:
  - `dependencies`
  - `devDependencies`
  - `scripts`
- `existsSync` sobre rutas fijas:
  - archivos: `angular.json`, `svelte.config.js`, `astro.config.*`, `nest-cli.json`,
    `next.config.*`, `nuxt.config.*`, `firebase.json`
  - carpetas: `pages/`, `functions/`

### No permitido
- Lectura profunda de contenido de codigo o config.
- Ejecucion de CLIs para detectar framework.
- Scans no ordenados para decisiones de deteccion.

### Requisitos de determinismo
- Orden estable de evaluacion de frameworks.
- Orden estable de evaluacion de senales por framework.
- Escaneo de scripts sobre claves ordenadas.

## Contrato de API publica

`detectFramework(packageInfo, rootPathOrOptions?: string | { rootPath?: string })`

- Con `rootPath`: evaluacion completa (package + filesystem).
- Sin `rootPath`: modo conservador (frameworks config-strict pueden quedar en `unknown`).

`detectProject()` siempre pasa `rootPath`.

## Modelo de confianza y clasificacion

### Pesos
- `Strong = 3`
- `Medium = 1`
- `Weak = 0.5`

### Umbrales
- `High >= 4`
- `Medium >= 3`
- `Low >= 1`

### Piso de clasificacion (precision-first)
- Un framework solo se clasifica si:
  - `score >= 3`
  - su guarda pasa (si existe)
- Si no, devuelve `unknown`.

### Contrato de confianza en salida
- Framework clasificado: `medium` o `high`.
- `unknown`: `low`.

## Matriz de senales y guardas

| Framework | Senales | Guarda |
|---|---|---|
| `react` (legacy-compat) | Strong: `react`, `react-dom`; Medium: `react-scripts`, script con `react-scripts`; Weak: `src/App.*` | Sin guarda anti-FP fuerte en P0 |
| `next` | Strong: dep `next`, `next.config.*`; Medium: script `next dev`, dir `pages/` | Precedencia sobre `react` solo en empate |
| `vue` (legacy-compat) | Strong: dep `vue`; Medium: `@vue/cli-service`, script con `vue-cli-service`; Weak: `vue.config.*` | Sin guarda anti-FP fuerte en P0 |
| `nuxt` | Strong: dep `nuxt`, `nuxt.config.*`; Medium: script `nuxt dev` | Precedencia sobre `vue` solo en empate |
| `angular` | Strong: `angular.json`, dep `@angular/core`, dep `@angular/cli`; Medium: scripts `ng serve`, `ng build` | Requiere `angular.json` O (`@angular/core` Y `@angular/cli`) |
| `sveltekit` | Strong: `svelte.config.js`, dep `@sveltejs/kit`, dep `svelte`; Medium: script `svelte-kit dev` | Requiere `svelte.config.js` |
| `astro` | Strong: `astro.config.(mjs|js|ts)`, dep `astro`; Medium: script `astro dev` | Requiere config + dep `astro` |
| `nestjs` | Strong: `nest-cli.json`, deps `@nestjs/core/@nestjs/common/@nestjs/cli`; Medium: script `nest start` | Requiere `nest-cli.json` |
| `svelte` | Strong: dep `svelte`; Medium: scripts con `svelte` | Requiere `svelte.config.js`; `sveltekit` gana en empate |
| `firebase-functions` | Strong: dep `firebase-functions`; Medium: `firebase.json`, dir `functions/` | En `detectProject`: sin `functions/` => `unknown` |
| `express` (legacy-compat) | Strong: dep `express` | Sin guarda anti-FP fuerte en P0 |
| `fastify` (legacy-compat) | Strong: dep `fastify` | Sin guarda anti-FP fuerte en P0 |

## Contrato de precedencia (solo tie-break)

### Reglas
- `next > react`
- `nuxt > vue`
- `sveltekit > svelte`
- `express > fastify`

### Flujo requerido
1. Construir candidatos validos (`score >= 3` y guarda aprobada).
2. Si no hay candidatos, devolver `unknown`.
3. Calcular `maxScore`.
4. Construir `top` con candidatos donde `score === maxScore`.
5. Si `top` tiene un candidato, seleccionarlo.
6. Si `top` tiene mas de uno, aplicar precedencia solo dentro de `top`.
7. Si precedencia deja un ganador unico, seleccionarlo.
8. Si no se resuelve, devolver `unknown`.

### Regla innegociable
La precedencia es solo desempate en `top` y nunca derrota un score mayor.

## Compatibilidad y regresion
- Fixtures existentes deben mantener `framework.type`.
- `tests/detect/framework-regression.test.ts` aplica el mapa estable.
- Monorepo no es `framework.type`:
  - monorepo vive en `folderStructure.isMonorepo`
  - `framework.type` puede ser `unknown`

## Alcance de "sin falsos positivos"
- Garantia fuerte anti-FP en P0 para:
  `angular`, `sveltekit`, `astro`, `nestjs`.
- `react/vue/express/fastify` siguen en legacy-compat y pueden clasificar library-like solo por deps.

## Fixtures P0 + expected framework.type

| Fixture | Expected |
|---|---|
| `angular-simple` | `angular` |
| `angular-ambiguous` | `unknown` |
| `sveltekit-simple` | `sveltekit` |
| `sveltekit-ambig` | `unknown` |
| `astro-simple` | `astro` |
| `astro-ambig` | `unknown` |
| `nest-simple` | `nestjs` |
| `nest-ambig` | `unknown` |
| `precedence-next-react` | `next` |
| `precedence-nuxt-vue` | `nuxt` |
| `react-library-like` | `react` (legacy-compat) |

## P0 - Issues + DoD (cerrado)

### P0-1: Extend framework types
- Scope: agregar `sveltekit`, `astro`, `nestjs` a `FrameworkType`.
- Files: `src/types.ts`.
- DoD:
  - Typecheck y tests en verde.
  - Sin drift en fixtures existentes.

### P0-2: API rootPath compatible
- Scope: `rootPathOrOptions` manteniendo compatibilidad.
- Files: `src/detect/framework-detector.ts`, `src/detect/index.ts`.
- DoD:
  - `detectProject()` pasa `rootPath`.
  - Tests cubren string y objeto para rootPath.

### P0-3: Scoring + guardas + precision-first
- Scope: matriz de senales, piso de score, umbrales y guardas anti-FP.
- Files: `src/detect/framework-detector.ts`.
- DoD:
  - Fixtures simple/ambiguous P0 pasan.
  - Casos con evidencia insuficiente devuelven `unknown`.

### P0-4: Precedencia y ambiguedad
- Scope: precedencia tie-break y `unknown` en empate no resoluble.
- Files: `src/detect/framework-detector.ts`, tests detect.
- DoD:
  - Precedencia solo en empate real.
  - Precedencia nunca derrota score mayor.

### P0-5: Fixtures y regresion
- Scope: fixtures P0 + regression map para pre-P0 fixtures.
- Files:
  - `tests/fixtures/*`
  - `tests/detect/framework-regression.test.ts`
  - `tests/detect/project-detector.test.ts`
- DoD:
  - Fixtures existentes mantienen expected type.
  - Fixtures nuevos cumplen expected type.

### P0-6: Render fallback safety
- Scope: nuevos framework types no rompen render y usan fallback base.
- Files: `tests/render/template-selection.test.ts`.
- DoD:
  - `angular/sveltekit/astro/nestjs` resuelven a `base.mustache`.
  - Casos existentes no cambian.

### Comandos de verificacion P0
- `npm run build`
- `npm test`
- `node dist/cli.js init tests/fixtures/react-vite --dry-run --profile compact`
- `node dist/cli.js init tests/fixtures/angular-simple --dry-run --profile compact`
- `node dist/cli.js init tests/fixtures/sveltekit-simple --dry-run --profile compact`
- `node dist/cli.js init tests/fixtures/astro-simple --dry-run --profile compact`
- `node dist/cli.js init tests/fixtures/nest-simple --dry-run --profile compact`
- `npm run benchmark:lite -- --json-only`
- `npm run benchmark:limits -- --json-only`
- `npm run benchmark:p1`

## P1 - Ejecucion por PR (framework detection only)

Nota: este bloque describe ejecucion y decisiones. El contrato tecnico sigue siendo este mismo documento.

### P1-1: Legacy app-likeness evaluation (sin cambio de algoritmo)

Definiciones operativas (solo evaluacion):
- `library-like`: dep de framework presente, sin script app (`dev|start|serve`) util, sin config fuerte, sin entrypoint app conocido.
- `app-like`: dep de framework + al menos una senal adicional permitida (`script`, config, o ruta app conocida por `existsSync`).

Fixtures de evidencia agregados:
- `vue-library-like`
- `express-library-like`
- `fastify-library-like`
- `express-app-like-minimal`
- `fastify-app-like-minimal`

Evidencia observada:

| Fixture | Resultado actual |
|---|---|
| `vue-library-like` | `vue` |
| `express-library-like` | `express` |
| `fastify-library-like` | `fastify` |
| `express-app-like-minimal` | `express` |
| `fastify-app-like-minimal` | `fastify` |

Decision P1-1: `NO-GO` para cambiar heuristica legacy en este ciclo.

Razon:
- No hay set de guardas app-likeness que mejore FP legacy sin riesgo alto de drift sobre fixtures historicos.
- Se mantiene comportamiento actual y se deja evidencia reproducible para PR futuro dedicado.

Condicion para abrir PR futuro de implementacion:
- propuesta usa solo senales permitidas,
- `framework-regression` sin drift,
- mejora medible de FP legacy en fixtures sinteticos sin aumentar `unknown` en fixtures positivos existentes.

### P1-2: Redwood viability study (sin implementacion)

Candidatos de diseno (solo viabilidad):
- Strong candidata: `redwood.toml`.
- Strong candidata: dep `@redwoodjs/core`.
- Medium candidatas: script `rw dev` o `yarn rw dev`, dirs `api/` y `web/`.
- Guarda candidata: requiere `redwood.toml`.
- Precedencia candidata: `redwood > react` solo tie-break.

Fixtures de evidencia agregados:
- `redwood-viability-simple`
- `redwood-viability-ambiguous`
- `redwood-viability-react-overlap`

Evidencia observada (estado actual, sin soporte redwood):

| Fixture | Resultado actual |
|---|---|
| `redwood-viability-simple` | `unknown` |
| `redwood-viability-ambiguous` | `unknown` |
| `redwood-viability-react-overlap` | `react` |

Decision P1-2: `GO` para un PR futuro de implementacion Redwood separado.

Checklist minimo para ese PR futuro:
- agregar tipo `redwood` de forma explicita,
- detector con guarda fuerte (`redwood.toml`) y tie-break-only,
- fixtures `simple/ambiguous/overlap`,
- regression test sin drift en fixtures existentes,
- render fallback a `base.mustache` si no hay template especifico.

### P1-4: Tie/near-tie robustness (tests + fixtures, sin algoritmo)

Fixtures agregados:
- `tie-next-react-equal-score`
- `near-tie-next-react-react-higher`
- `tie-nuxt-vue-equal-score`
- `near-tie-nuxt-vue-vue-higher`
- `unresolved-tie-cross-family`

Cobertura agregada:
- tie real se resuelve por precedencia,
- near-tie mantiene ganador por score mayor,
- tie sin regla de precedencia retorna `unknown`,
- modo conservador sin `rootPath` para `astro/sveltekit/nestjs` retorna `unknown`.

Decision P1-4: `GO` cerrado (robustez completada sin tocar algoritmo).

### P1-3: Gated threshold/weight tuning

Este es el unico PR P1 que puede tocar pesos/umbrales. Gate obligatorio:
1. `0` drift en `tests/detect/framework-regression.test.ts`.
2. Grupo B (`unknown` esperado) no aumenta falsos positivos.
3. Grupo A (positivos) no aumenta `unknown`.
4. Ademas cumple una:
   - reduce `unknown` en Grupo A al menos en 1, o
   - mejora confianza (`medium -> high`) en al menos 2 fixtures de Grupo A sin cambiar `type`.
5. Determinismo intacto con benchmarks en verde.

Decision actual P1-3: `NO-GO` en este ciclo.

Razon:
- No hay candidato que garantice mejora medible bajo gate completo sin elevar riesgo de drift.
- Se mantiene el algoritmo actual.

## Tabla resumen P1 por PR

| PR | Objetivo | Resultado |
|---|---|---|
| P1-1 | Evaluar app-likeness legacy sin cambiar detector | `NO-GO` (docs + evidencia) |
| P1-2 | Viabilidad Redwood sin implementarlo | `GO` para PR futuro separado |
| P1-4 | Expandir matrix tie/near-tie + no-rootPath | `GO` (tests/fixtures) |
| P1-3 | Tuning gated de pesos/umbrales | `NO-GO` en este ciclo |

## Comandos de verificacion para ejecucion P1
- `npm run build`
- `npm test`
- `node dist/cli.js init tests/fixtures/react-vite --dry-run --profile compact`
- `node dist/cli.js init tests/fixtures/angular-simple --dry-run --profile compact`
- `node dist/cli.js init tests/fixtures/sveltekit-simple --dry-run --profile compact`
- `node dist/cli.js init tests/fixtures/astro-simple --dry-run --profile compact`
- `node dist/cli.js init tests/fixtures/nest-simple --dry-run --profile compact`
- `npm run benchmark:lite -- --json-only`
- `npm run benchmark:limits -- --json-only`
- `npm run benchmark:p1`
