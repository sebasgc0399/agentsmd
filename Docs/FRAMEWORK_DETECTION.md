# Contrato de Detección de Frameworks (P0 Cerrado)

## Propósito
Este documento es la fuente única de verdad para el comportamiento de detección de frameworks en `agents-md`.

Objetivos:
- Detección determinista a partir de `package.json` + `existsSync` en rutas conocidas.
- Clasificación con prioridad en precisión (`unknown` cuando la evidencia es insuficiente).
- Fuertes protecciones anti-falsos-positivos para nuevos frameworks P0:
`angular`, `sveltekit`, `astro`, `nestjs`.
- Compatibilidad retroactiva con fixtures existentes (`framework.type` no debe cambiar).

## Entradas Permitidas y Determinismo

### Entradas permitidas
- `package.json`:
  - `dependencies`
  - `devDependencies`
  - `scripts`
- `existsSync` solo en rutas fijas:
  - archivos como `angular.json`, `svelte.config.js`, `astro.config.*`, `nest-cli.json`, `next.config.*`, `nuxt.config.*`, `firebase.json`
  - directorios como `pages/`, `functions/`

### No permitido
- Análisis profundo del contenido de archivos fuente/configuración.
- Ejecutar CLIs de frameworks durante la detección.
- Escaneos de directorios no ordenados para decisiones de detección.

### Requisitos de determinismo
- Orden de evaluación de frameworks estable.
- Orden de evaluación de señales estable por framework.
- Escaneo de scripts sobre claves de scripts ordenadas.

## Contrato de API Pública

`detectFramework(packageInfo, rootPathOrOptions?: string | { rootPath?: string })`

- Con `rootPath`: detector completo (señales de paquete + sistema de archivos).
- Sin `rootPath`: modo conservador (frameworks que requieren config pueden permanecer `unknown`).

`detectProject()` siempre proporciona `rootPath`.

## Modelo de Confianza y Clasificación

### Pesos
- `Strong = 3`
- `Medium = 1`
- `Weak = 0.5`

### Umbrales
- `High >= 4`
- `Medium >= 3`
- `Low >= 1`

### Piso de clasificación (prioridad en precisión)
- Un framework se clasifica solo si:
  - `score >= 3`
  - la guarda del framework pasa (si está definida)
- En caso contrario, el resultado es `unknown`.

### Contrato de salida de confianza
- Framework clasificado: `medium` o `high`.
- `unknown`: `low`.

## Matriz de Señales y Guardas

| Framework | Señales | Guarda |
|---|---|---|
| `react` (compat-legacy) | Strong: `react`, `react-dom`; Medium: `react-scripts`, script con `react-scripts`; Weak: `src/App.*` | Sin guarda anti-FP fuerte en P0 |
| `next` | Strong: dep `next`, `next.config.*`; Medium: script `next dev`, directorio `pages/` | Precedencia sobre `react` solo en empate |
| `vue` (compat-legacy) | Strong: dep `vue`; Medium: `@vue/cli-service`, script con `vue-cli-service`; Weak: `vue.config.*` | Sin guarda anti-FP fuerte en P0 |
| `nuxt` | Strong: dep `nuxt`, `nuxt.config.*`; Medium: script `nuxt dev` | Precedencia sobre `vue` solo en empate |
| `angular` | Strong: `angular.json`, dep `@angular/core`, dep `@angular/cli`; Medium: scripts `ng serve`, `ng build` | Requiere `angular.json` O (`@angular/core` Y `@angular/cli`) |
| `sveltekit` | Strong: `svelte.config.js`, dep `@sveltejs/kit`, dep `svelte`; Medium: script `svelte-kit dev` | Requiere `svelte.config.js` |
| `astro` | Strong: `astro.config.(mjs|js|ts)`, dep `astro`; Medium: script `astro dev` | Requiere config + dep `astro` |
| `nestjs` | Strong: `nest-cli.json`, deps `@nestjs/core/@nestjs/common/@nestjs/cli`; Medium: script `nest start` | Requiere `nest-cli.json` |
| `svelte` | Strong: dep `svelte`; Medium: scripts con `svelte` | Requiere `svelte.config.js`; precedencia de `sveltekit` solo en empate |
| `firebase-functions` | Strong: dep `firebase-functions`; Medium: `firebase.json`, directorio `functions/` | Verificación adicional a nivel de proyecto: si falta `functions/` => `unknown` |
| `express` (compat-legacy) | Strong: dep `express` | Sin guarda anti-FP fuerte en P0 |
| `fastify` (compat-legacy) | Strong: dep `fastify` | Sin guarda anti-FP fuerte en P0 |

## Contrato de Precedencia (Solo Desempate)

### Reglas
- `next > react`
- `nuxt > vue`
- `sveltekit > svelte`
- `express > fastify`

### Flujo de selección requerido
1. Construir candidatos válidos (`score >= 3` y guarda aprobada).
2. Si no hay candidatos, retornar `unknown`.
3. Calcular `maxScore`.
4. Construir candidatos `top` donde `score === maxScore`.
5. Si `top` tiene un candidato, seleccionarlo.
6. Si `top` tiene múltiples candidatos, aplicar precedencia **solo dentro de `top`**.
7. Si la precedencia produce un único ganador, seleccionarlo.
8. Si sigue siendo ambiguo, retornar `unknown`.

### Regla innegociable
La precedencia es solo desempate sobre candidatos con puntuación máxima y **nunca anula una puntuación mayor**.

## Política de Compatibilidad y Regresión
- Los fixtures existentes deben mantener el mismo `framework.type`.
- La regresión se aplica mediante tests dedicados de mapa de fixtures.
- Monorepo no es un tipo de framework:
- el framework permanece independiente (`framework.type` puede ser `unknown`)
- el estado de monorepo vive en `folderStructure.isMonorepo`

## Alcance de "Sin Falsos Positivos"
- La garantía fuerte anti-FP aplica en P0 a:
`angular`, `sveltekit`, `astro`, `nestjs`.
- `react/vue/express/fastify` permanecen como compat-legacy y pueden clasificar proyectos tipo librería solo desde dependencias.

## Fixtures P0 + framework.type Esperado

| Fixture | Esperado |
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
| `react-library-like` | `react` (compat-legacy) |

## P0 - Issues + DoD (Cerrado)

### P0-1: Extender tipos de framework
- Alcance: agregar `sveltekit`, `astro`, `nestjs` a la unión de tipos de framework.
- Archivos: `src/types.ts`.
- DoD:
  - Typecheck y tests pasan.
  - Sin cambio de tipo en fixtures existentes.

### P0-2: API compatible con rootPath para el detector
- Alcance: aceptar `rootPathOrOptions` manteniendo compatibilidad de API.
- Archivos: `src/detect/framework-detector.ts`, `src/detect/index.ts`.
- DoD:
  - `detectProject()` pasa `rootPath`.
  - Tests unitarios cubren formas string y objeto de rootPath.

### P0-3: Motor de puntuación + guardas + prioridad en precisión
- Alcance: señales basadas en matriz, piso de puntuación, umbrales de confianza, guardas anti-FP.
- Archivos: `src/detect/framework-detector.ts`.
- DoD:
  - Tests de frameworks nuevos simple/ambiguo pasan.
  - Se retorna unknown cuando piso/guardas fallan.

### P0-4: Manejo de precedencia y ambigüedad
- Alcance: reglas de precedencia y unknown en ambigüedad no resuelta.
- Archivos: `src/detect/framework-detector.ts`, tests del detector.
- DoD:
  - Tests de precedencia por desempate pasan.
  - Empate no resoluble retorna `unknown`.

### P0-5: Fixtures y endurecimiento de regresión
- Alcance: agregar fixtures P0 + mapa de regresión para fixtures antiguos.
- Archivos:
  - `tests/fixtures/*` (nuevos fixtures P0)
  - `tests/detect/framework-regression.test.ts`
  - `tests/detect/project-detector.test.ts`
- DoD:
  - Fixtures existentes mantienen `framework.type` esperado.
  - Expectativas de nuevos fixtures pasan.

### P0-6: Fallback seguro en renderizado
- Alcance: verificar que los nuevos tipos de framework no rompen el renderizado y hacen fallback al template base.
- Archivos: `tests/render/template-selection.test.ts`.
- DoD:
  - `angular/sveltekit/astro/nestjs` resuelven a `base.mustache`.
  - El comportamiento de templates existentes permanece estable.

### Comandos de verificación P0
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

## P1 - Backlog (Referencia)

### P1-1: Evaluacion de app-likeness legacy (sin cambio de algoritmo)
- Objetivo: documentar `library-like` vs `app-like` para `react/vue/express/fastify` sin enforcement nuevo.
- Definiciones operativas (solo evaluacion):
  - `library-like`: dep de framework presente, sin scripts `dev|start|serve` utiles, sin config fuerte, sin entrypoint de app conocido.
  - `app-like`: dep de framework + al menos una senal adicional permitida (`script`, config o ruta conocida via `existsSync`).
- Evidencia de fixtures:
  - `vue-library-like` => `vue`
  - `express-library-like` => `express`
  - `fastify-library-like` => `fastify`
  - `express-app-like-minimal` => `express`
  - `fastify-app-like-minimal` => `fastify`
- Decision P1-1: `NO-GO` para cambio de heuristica legacy en este ciclo.
- Condicion para PR futuro:
  - solo senales permitidas,
  - `framework-regression` sin drift,
  - mejora medible en FP legacy sin subir `unknown` en fixtures positivos actuales.

### P1-2: Evaluacion de Redwood (viability, sin implementacion)
- Objetivo: evaluar viabilidad de deteccion de `redwood` e impacto en compatibilidad, sin tocar detector ni tipos.
- Senales candidatas para un PR futuro:
  - Strong: `redwood.toml`
  - Strong: dep `@redwoodjs/core`
  - Medium: script `rw dev`/`yarn rw dev`
  - Medium: dirs `api/` y `web/`
  - Guarda candidata: requerir `redwood.toml`
  - Precedencia candidata: `redwood > react` solo tie-break
- Evidencia observada (estado actual):
  - `redwood-viability-simple` => `unknown`
  - `redwood-viability-ambiguous` => `unknown`
  - `redwood-viability-react-overlap` => `react`
- Decision P1-2 (basada en evidencia): `GO` condicionado para PR futuro separado.
- Condiciones del PR futuro:
  - no drift en `framework-regression`,
  - guarda fuerte anti-FP obligatoria,
  - precedencia tie-break-only,
  - fallback de render a `base.mustache`.

### P1-3: Ajuste de umbrales con evidencia (docs-only)
- Objetivo: registrar el resultado del gate de tuning sin tocar codigo del detector.
- Gate requerido para habilitar tuning en un PR futuro:
  1. `0` drift en `tests/detect/framework-regression.test.ts`.
  2. Grupo B (`unknown` esperado) no aumenta falsos positivos.
  3. Grupo A (positivos) no aumenta `unknown`.
  4. Ademas, cumplir una:
     - reducir `unknown` en Grupo A al menos en 1, o
     - mejorar `confidence` (`medium -> high`) en al menos 2 fixtures de Grupo A sin cambiar `type`.
  5. Determinismo intacto.
- Resultado del ciclo actual: `NO-GO`.
- Razon: no hay candidato con mejora medible bajo gate completo sin elevar riesgo de drift.
- Proximo paso: mantener algoritmo actual y re-evaluar con evidencia adicional.

### P1-4: Robustez tie/near-tie (unit-first, sin algoritmo)
- Objetivo: ampliar cobertura de empates y casi-empates sin cambiar el detector.
- Enfoque principal: tests unit sinteticos con inputs controlados.
- Integracion minima con fixtures:
  - `tie-next-react-equal-score`
  - `tie-nuxt-vue-equal-score`
  - `unresolved-tie-cross-family`
- Cobertura esperada:
  - tie real: precedencia resuelve,
  - near-tie: gana score mayor,
  - tie sin regla: `unknown`,
  - config-strict sin `rootPath`: modo conservador (`unknown`).
- Decision P1-4: `GO` (robustez cerrada con tests/fixtures, sin cambios en `src/detect/*`).
