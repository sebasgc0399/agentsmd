# Framework Detection (P0)

## Objetivo
Detectar framework de forma determinista con:

- Inputs limitados a `package.json` y `existsSync` en paths conocidos.
- Scoring reproducible por señales (`Strong/Medium/Weak`).
- Guardas anti-falsos-positivos para frameworks nuevos P0.
- Precedencia fija para casos ambiguos.
- Política `precision-first`: si no hay evidencia suficiente, devolver `unknown`.

## Inputs permitidos y determinismo

### Inputs
- `package.json`:
- `dependencies`
- `devDependencies`
- `scripts`
- `existsSync` en paths fijos:
- Config files (`angular.json`, `svelte.config.js`, `astro.config.*`, `nest-cli.json`, etc.)
- Carpetas puntuales (`pages/`, `functions/`)

### Restricciones
- No lectura profunda de contenido de archivos.
- No ejecución de CLIs externas.
- No glob/readdir no ordenado.
- Orden estable en evaluación de frameworks y señales.
- Scripts evaluados en orden de claves ordenadas (`sort()`).

## Contrato de API

`detectFramework(packageInfo, rootPathOrOptions?: string | { rootPath?: string })`

- Con `rootPath`: detector completo (incluye señales de filesystem).
- Sin `rootPath`: modo conservador; frameworks config-strict pueden devolver `unknown`.

`detectProject()` siempre pasa `rootPath`, por lo que el CLI usa la detección completa.

## Modelo de confianza y clasificación

- Pesos:
- `Strong = 3`
- `Medium = 1`
- `Weak = 0.5`

- Umbrales:
- `High >= 4`
- `Medium >= 3`
- `Low >= 1`

- Clasificación (`precision-first`):
- Se clasifica framework solo con `score >= 3` y guarda aprobada.
- Si no alcanza piso o falla guarda: `unknown`.
- Framework clasificado expone `confidence: medium|high`.
- `unknown` expone `confidence: low`.

## Matriz de señales y guardas

| Framework | Señales | Guarda anti-FP |
|---|---|---|
| `react` (legacy-compat) | Strong: `react`, `react-dom`; Medium: `react-scripts`, script con `react-scripts`; Weak: `src/App.*` | Sin guarda fuerte en P0 (limitación legacy) |
| `next` | Strong: dep `next`, `next.config.*`; Medium: script `next dev`, dir `pages/` | Precedencia `next > react` |
| `vue` (legacy-compat) | Strong: dep `vue`; Medium: `@vue/cli-service`, script `vue-cli-service`; Weak: `vue.config.*` | Sin guarda fuerte en P0 (limitación legacy) |
| `nuxt` | Strong: dep `nuxt`, `nuxt.config.*`; Medium: script `nuxt dev` | Precedencia `nuxt > vue` |
| `angular` | Strong: `angular.json`, dep `@angular/core`, dep `@angular/cli`; Medium: scripts `ng serve`, `ng build` | Requiere `angular.json` OR (`@angular/core` AND `@angular/cli`) |
| `sveltekit` | Strong: `svelte.config.js`, dep `@sveltejs/kit`, dep `svelte`; Medium: script `svelte-kit dev` | Requiere `svelte.config.js` |
| `astro` | Strong: `astro.config.(mjs|js|ts)`, dep `astro`; Medium: script `astro dev` | Requiere config Astro y dep `astro` |
| `nestjs` | Strong: `nest-cli.json`, deps `@nestjs/core/@nestjs/common/@nestjs/cli`; Medium: script `nest start` | Requiere `nest-cli.json` |
| `svelte` | Strong: dep `svelte`; Medium: scripts con `svelte` | Precedencia `sveltekit > svelte` |
| `firebase-functions` | Strong: dep `firebase-functions`; Medium: `firebase.json`, dir `functions/` | En `detectProject`: sin `functions/` => `unknown` |
| `express` (legacy-compat) | Strong: dep `express` | Sin guarda fuerte en P0 (limitación legacy) |
| `fastify` (legacy-compat) | Strong: dep `fastify` | Sin guarda fuerte en P0 (limitación legacy) |

## Precedencia y empates

Reglas fijas:

- `next > react`
- `nuxt > vue`
- `sveltekit > svelte`
- `express > fastify` (compatibilidad con fixtures actuales)

Si hay empate por score y ninguna regla deja un ganador único: `unknown`.

## Compatibilidad y regresión

- Objetivo de compatibilidad P0: fixtures existentes mantienen su `framework.type`.
- La regresión se valida con una suite dedicada (`fixture -> framework.type`).
- Monorepo no se modela como framework:
- `framework.type` puede ser `unknown`
- estado monorepo vive en `folderStructure.isMonorepo`

## Alcance de "sin falsos positivos"

En P0, la garantía fuerte anti-FP aplica a frameworks nuevos:

- `angular`
- `sveltekit`
- `astro`
- `nestjs`

`react/vue/express/fastify` quedan en `legacy-compat`; pueden clasificar proyectos library-like por dependencias.

## Fixtures P0 y resultados esperados

| Fixture | Resultado esperado |
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

## Plan P0/P1

### P0 (este cambio)
- Implementar matriz de señales con scoring.
- Agregar guardas anti-FP para frameworks nuevos.
- Añadir fixtures/tests de simple/ambiguous/precedence/regresión.
- Mantener fallback de render a `base.mustache` para frameworks nuevos.

### P1 (siguiente etapa)
- Evaluar guardas de app-likeness para legacy (`react/vue/express/fastify`) si no rompe compatibilidad.
- Evaluar incorporación de `redwood`.
- Ajustar thresholds solo con evidencia de tests de regresión.
