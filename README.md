# agents-md

[![npm version](https://img.shields.io/npm/v/%40sebasgc0399%2Fagents-md?label=npm)](https://www.npmjs.com/package/@sebasgc0399/agents-md)
[![npm downloads](https://img.shields.io/npm/dm/%40sebasgc0399%2Fagents-md?label=downloads)](https://www.npmjs.com/package/@sebasgc0399/agents-md)
[![ci](https://img.shields.io/github/actions/workflow/status/sebasgc0399/agents-md/ci.yml?branch=main&label=quality)](https://github.com/sebasgc0399/agents-md/actions/workflows/ci.yml)
[![release](https://img.shields.io/github/v/release/sebasgc0399/agents-md?label=release&cacheSeconds=300)](https://github.com/sebasgc0399/agents-md/releases/latest)
[![license](https://img.shields.io/github/license/sebasgc0399/agents-md?label=license)](https://github.com/sebasgc0399/agents-md/blob/main/LICENSE)

CLI para generar archivos `AGENTS.md` automáticamente para proyectos Node.js.

## Tabla de contenido

- [¿Qué es AGENTS.md?](#qué-es-agentsmd)
- [Quickstart](#quickstart)
- [Instalación](#instalación)
- [Uso](#uso)
- [Perfiles de salida](#perfiles-de-salida)
- [Límites de salida](#límites-de-salida-límites-suaves)
- [Proyectos soportados](#proyectos-soportados)
- [Estado actual de plantillas](#estado-actual-de-plantillas)
- [Cómo funciona](#cómo-funciona)
- [Releases y novedades](#releases-y-novedades)
- [Desarrollo](#desarrollo)
- [Dependency maintenance](#dependency-maintenance)
- [Contribuciones](#contribuciones)
- [Soporte](#soporte)
- [Licencia](#licencia)

## ¿Qué es AGENTS.md?

`AGENTS.md` es un documento para asistentes de código (IA) que resume cómo trabajar en tu proyecto sin adivinar.

Incluye, de forma práctica:

- Comandos recomendados para instalar, ejecutar, compilar, lint y pruebas.
- Convenciones de código y estilo.
- Guía de validación y pruebas antes de cerrar tareas.
- Reglas de seguridad y calidad.
- Criterios claros para considerar una tarea como terminada.

## Quickstart

Antes de ejecutar:

- Paquete en npm: `@sebasgc0399/agents-md`
- Comando del CLI: `agents-md`
- Importante: no uses `npx agents-md ...` sin scope; usa `@sebasgc0399/agents-md`.

Uso sin instalación (recomendado):

```bash
npx @sebasgc0399/agents-md init
npx @sebasgc0399/agents-md init --dry-run
npx @sebasgc0399/agents-md init --profile compact
npx @sebasgc0399/agents-md init --profile standard
npx @sebasgc0399/agents-md init --profile full
```

## Instalación

Opción 1: sin instalación (npx)

```bash
npx @sebasgc0399/agents-md init
```

Opción 2: instalación global

```bash
npm install -g @sebasgc0399/agents-md
agents-md init
```

Requisitos:

- Node.js >= 18
- `package.json` en la raíz del proyecto

## Uso

```bash
# Generar AGENTS.md en el directorio actual
agents-md init

# Vista previa sin escribir archivo
agents-md init --dry-run

# Elegir perfil de salida (default: compact)
agents-md init --profile compact
agents-md init --profile standard
agents-md init --profile full

# Sobrescribir archivo existente
agents-md init --force

# Mostrar detalles de detección
agents-md init --verbose

# Especificar ruta de salida
agents-md init --out ./docs/AGENTS.md
```

Qué hace cada opción clave:

- `--dry-run`: muestra el resultado sin escribir `AGENTS.md`.
- `--profile`: cambia nivel de detalle (`compact`, `standard`, `full`).
- `--force`: permite sobrescribir un archivo existente.
- `--verbose`: muestra cómo se detectó el proyecto y los comandos encontrados.
- `--out`: define la ruta y nombre del archivo de salida.

Nota: las flags `-y/--yes` y `-i/--interactive` están reservadas y hoy no cambian el comportamiento.

## Perfiles de salida

- `compact` (default): salida breve y directa (objetivo aproximado: 30-90 líneas).
- `standard`: salida intermedia para equipos (objetivo aproximado: 130-190 líneas).
- `full`: salida más detallada para traspaso técnico y CI (objetivo aproximado: 200-280 líneas).

## Límites de salida (límites suaves)

- `compact`: 190-700 tokens, 30-90 líneas
- `standard`: 1050-1700 tokens, 130-190 líneas
- `full`: 1650-2600 tokens, 200-280 líneas

Cómo se interpretan estos límites:

- El rango base es el objetivo principal por perfil.
- Se aplica una tolerancia de +-10%.
- Si el resultado queda fuera del rango base, se reporta advertencia.
- Si queda fuera de la tolerancia, se reporta incumplimiento P0 no bloqueante.
- La generación solo se bloquea cuando hay errores de validación.

## Proyectos soportados

- React (Vite, CRA, Next.js)
- Vue (Vite, Nuxt)
- Angular
- Svelte y SvelteKit
- Astro
- NestJS
- Firebase Functions
- Express y Fastify
- Proyectos Node.js genéricos
- Monorepos (Turborepo/Nx)

## Estado actual de plantillas

| Plantilla | Frameworks que la usan |
| --- | --- |
| `react.mustache` | `react`, `next` |
| `vue.mustache` | `vue`, `nuxt` |
| `angular.mustache` | `angular` |
| `svelte.mustache` | `svelte`, `sveltekit` |
| `nestjs.mustache` | `nestjs` |
| `astro.mustache` | `astro` |
| `fastify.mustache` | `fastify` |
| `firebase.mustache` | `firebase-functions` |
| `monorepo.mustache` | cualquier monorepo |
| `base.mustache` | `express`, proyectos Node.js genericos y casos `unknown` |

Notas importantes:

- Si se detecta monorepo, `monorepo.mustache` tiene prioridad sobre cualquier framework.
- `express` usa `base.mustache` por ser un framework intencionalmente no-opinado.
- Las plantillas compartidas usan bloques condicionales internos: `svelte.mustache` incluye secciones especificas de SvelteKit y `vue.mustache` incluye secciones especificas de Nuxt.

## Cómo funciona

1. Lee `package.json` del proyecto.
2. Detecta la estructura de carpetas y el framework principal.
3. Detecta runtime y gestor de paquetes (`npm`, `yarn`, `pnpm` o `bun`) usando lockfiles y metadatos.
4. Revisa `package.json > scripts` para encontrar comandos existentes.
5. Para cada tarea usa una prioridad fija de nombres: desarrollo (`dev` > `start` > `serve`), build (`build` > `compile`), pruebas (`test` > `test:unit` > `vitest` > `jest`), lint (`lint` > `eslint`) y formato (`format` > `prettier`).
6. Construye el comando final según el gestor detectado (por ejemplo `npm run build`, `yarn build`, `pnpm run build`).
7. Si un script no existe, no lo inventa: ese comando se deja como no disponible.
8. Genera un `AGENTS.md` limpio y consistente según el perfil seleccionado.

## Releases y novedades

Cambios en la versión actual (v0.4.1 - 2026-02-21):

- Se incorporó una política de actualización segura de dependencias con runbooks en `Docs/DEPENDENCY_UPDATES.md` y `Docs/SECURITY_TRACKING.md`.
- Se agregó configuración de Dependabot y mejoras en CI para reforzar validaciones de calidad y mantenimiento.
- Se actualizaron dependencias en `package.json` y `package-lock.json`, eliminando entradas obsoletas.

Actualizar a la última versión global:

```bash
npm update -g @sebasgc0399/agents-md 
```

[Ver historial completo de versiones](https://github.com/sebasgc0399/agents-md/releases)

## Desarrollo

```bash
# Instalar dependencias
npm install

# Build
npm run build

# Modo desarrollo (watch)
npm run dev

# Tests
npm test

# Coverage
npm run test:coverage

# Lint (verificar tipos)
npm run lint

# Benchmark base de calidad (P0)
npm run benchmark:lite

# Benchmark de límites por perfil (estimado vs token real)
npm run benchmark:limits

# Benchmark P1 (línea base semántica y control de regresión)
npm run benchmark:p1

# Regenerar línea base P1 (solo cuando el cambio es intencional)
npm run benchmark:p1:update

# Benchmark P2 (tendencias semanales, no bloqueante)
npm run benchmark:p2

# Benchmark P2 local (sin GitHub Issues)
npm run benchmark:p2:local

# Benchmark P2 determinístico (json-only, fecha fija)
npm run benchmark:p2:deterministic

# Smoke del CLI compilado
node dist/cli.js init --dry-run
```

### Dependency maintenance

Policy and workflow:

- `Docs/DEPENDENCY_UPDATES.md`
- `Docs/SECURITY_TRACKING.md`

Operational commands:

- Runtime update: `npm run deps:update:runtime`
- Runtime verification: `npm run deps:verify:runtime`
- Dev update batch: `npm run deps:update:all`
- Dev verification: `npm run deps:verify:dev`

### Runbook P2 (operación)

Comandos de operación:

- Local sin red/issues: `npm run benchmark:p2:local`
- Determinístico local: `npm run benchmark:p2:deterministic`
- CI/semanal: `npm run benchmark:p2`

Cómo leer los reportes:

- `artifacts/benchmark-p2/report.json`: salida estructurada con `metrics`, `issues` y `alerts`.
- `artifacts/benchmark-p2/report.md`: resumen pensado para `GITHUB_STEP_SUMMARY`.

Interpretación rápida de alertas P2:

- `determinism_rate`: revisar salidas inestables entre corridas del mismo fixture/perfil.
- `invalid_command_rate`: revisar detección de comandos contra scripts reales y la lista permitida (allowlist).
- `score_vs_baseline`: revisar diferencia de puntaje contra la línea base P1; corregir o justificar actualización.
- `p1_status`: ejecutar `npm run benchmark:p1` y resolver diferencias antes de continuar.

## Contribuciones

Gracias por ayudar a mejorar `agents-md`.

Para mantener calidad y claridad en el proyecto:

- Abre un issue antes de cambios no triviales.
- Incluye problema, propuesta de solución y trade-offs técnicos.
- Si usaste IA, revisa manualmente el resultado antes de abrir PR.
- Mantén los PRs pequeños y enfocados.
- Agrega o actualiza tests cuando cambie el comportamiento.
- Ejecuta `npm test` antes de enviar.

Comandos de desarrollo y validación: ver sección `## Desarrollo`.

## Soporte

Si esta herramienta te resulta útil, puedes apoyar el proyecto de estas formas:

- Dar estrella al repo.
- Compartirlo con tu equipo.
- Reportar bugs con pasos reproducibles.
- Proponer mejoras vía issues o PRs acotados.

## Licencia

MIT © 2026 sebasgc0399
