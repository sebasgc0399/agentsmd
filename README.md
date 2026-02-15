# agents-md

[![npm version](https://img.shields.io/npm/v/%40sebasgc0399%2Fagents-md?label=npm)](https://www.npmjs.com/package/@sebasgc0399/agents-md)
[![npm downloads](https://img.shields.io/npm/dm/%40sebasgc0399%2Fagents-md?label=downloads)](https://www.npmjs.com/package/@sebasgc0399/agents-md)
[![ci](https://img.shields.io/github/actions/workflow/status/sebasgc0399/agents-md/ci.yml?branch=main&label=quality)](https://github.com/sebasgc0399/agents-md/actions/workflows/ci.yml)
[![release](https://img.shields.io/github/v/release/sebasgc0399/agents-md?label=release&cacheSeconds=300)](https://github.com/sebasgc0399/agents-md/releases/latest)
[![license](https://img.shields.io/github/license/sebasgc0399/agents-md?label=license)](https://github.com/sebasgc0399/agents-md/blob/main/LICENSE)

CLI para generar archivos `AGENTS.md` automaticamente para proyectos Node.js.

## Tabla de contenido

- [¿Que es AGENTS.md?](#que-es-agentsmd)
- [Quickstart](#quickstart)
- [Instalacion](#instalacion)
- [Uso](#uso)
- [Perfiles de salida](#perfiles-de-salida)
- [Proyectos soportados](#proyectos-soportados)
- [Releases y novedades](#releases-y-novedades)
- [Desarrollo](#desarrollo)
- [Contribuciones](#contribuciones)
- [Soporte](#soporte)
- [Licencia](#licencia)

## ¿Que es AGENTS.md?

`AGENTS.md` es un "README para AI agents" que reduce alucinaciones al proporcionar:

- Comandos canonicos (setup, test, build, lint)
- Convenciones de codigo y estilo
- Guias de testing
- Reglas de seguridad
- Definition of Done

## Quickstart

Nombres importantes para evitar confusion:

- Package en npm: `@sebasgc0399/agents-md`
- Comando instalado: `agents-md`
- No usar `npx agents-md ...` sin scope

Uso sin instalacion (recomendado):

```bash
npx -p @sebasgc0399/agents-md agents-md init
npx -p @sebasgc0399/agents-md agents-md init --dry-run
npx -p @sebasgc0399/agents-md agents-md init --profile compact
npx -p @sebasgc0399/agents-md agents-md init --profile standard
npx -p @sebasgc0399/agents-md agents-md init --profile full
```

## Instalacion

Opcion 1: sin instalacion (npx)

```bash
npx -p @sebasgc0399/agents-md agents-md init
```

Opcion 2: instalacion global

```bash
npm install -g @sebasgc0399/agents-md
agents-md init
```

Requisitos:

- Node.js >= 18
- `package.json` en la raiz del proyecto

## Uso

```bash
# Generar AGENTS.md en el directorio actual
agents-md init

# Preview sin escribir archivo
agents-md init --dry-run

# Elegir perfil de salida (default: compact)
agents-md init --profile compact
agents-md init --profile standard
agents-md init --profile full

# Sobrescribir archivo existente
agents-md init --force

# Modo verbose (mostrar detalles de deteccion)
agents-md init --verbose

# Especificar ruta de salida
agents-md init --out ./docs/AGENTS.md
```

Nota: actualmente las flags `-y/--yes` y `-i/--interactive` estan reservadas y no cambian el comportamiento del comando.

## Perfiles de salida

- `compact` (default): salida corta y directa (~30-90 lineas objetivo)
- `standard`: salida mas completa para equipos (~130-190 lineas objetivo)
- `full`: salida mas detallada para handoff y CI (~200-280 lineas objetivo)

## Limites de salida (soft limits)

- `compact`: 190-700 tokens, 30-90 lines
- `standard`: 1050-1700 tokens, 130-190 lines
- `full`: 1650-2600 tokens, 200-280 lines

Se aplica tolerancia de +-10% por perfil. Fuera del rango base genera warning; fuera de tolerancia se reporta breach no bloqueante en P0.
La generacion solo se bloquea cuando hay errors de validacion.

## Proyectos soportados

- React (Vite, CRA, Next.js)
- Vue (Vite, Nuxt)
- Firebase Functions
- Proyectos Node.js genericos
- Monorepos (Turborepo/Nx)

## Como funciona

1. Lee `package.json`.
2. Detecta framework y estructura de carpetas.
3. Extrae comandos canonicos desde scripts.
4. Genera un `AGENTS.md` limpio y conciso segun el perfil seleccionado.

## Releases y novedades

Cambios en esta version actual:

- Benchmark de calidad P0/P1/P2 integrado (`benchmark:lite`, `benchmark:p1`, `benchmark:p2`)
- Baseline reproducible de limites por perfil (`benchmark:limits`)
- Gates de calidad en CI para benchmark lite + baseline semantico P1
- Workflow semanal/manual de tendencias (`benchmark-trends`) con reporte JSON/Markdown

Actualizar a la ultima version global:

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

# Benchmark lite (P0 quality gate)
npm run benchmark:lite

# Benchmark de limites por perfil (estimado vs token real)
npm run benchmark:limits

# Benchmark P1 (semantic baseline + regression budget)
npm run benchmark:p1

# Regenerar baseline P1 (solo cuando el cambio es intencional)
npm run benchmark:p1:update

# Benchmark P2 (weekly trends report, non-blocking)
npm run benchmark:p2

# Benchmark P2 local (sin GitHub Issues)
npm run benchmark:p2:local

# Benchmark P2 deterministico (json-only, fecha fija)
npm run benchmark:p2:deterministic

# Smoke del CLI compilado
node dist/cli.js init --dry-run
```

### Runbook P2 (operacion)

Comandos de operacion:

- Local sin red/issues: `npm run benchmark:p2:local`
- Deterministico local: `npm run benchmark:p2:deterministic`
- CI/semanal: `npm run benchmark:p2`

Lectura minima de reportes:

- `artifacts/benchmark-p2/report.json`: estado estructurado (`metrics`, `issues`, `alerts`).
- `artifacts/benchmark-p2/report.md`: resumen para `GITHUB_STEP_SUMMARY`.

Respuesta a alertas P2:

- `determinism_rate`: revisar salida no estable (doble corrida por fixture/perfil).
- `invalid_command_rate`: validar comandos contra scripts reales + allowlist.
- `score_vs_baseline`: revisar drift contra baseline P1; corregir o justificar update.
- `p1_status`: ejecutar `npm run benchmark:p1` y resolver drift/regresion antes de continuar.

## Contribuciones

Gracias por ayudar a mejorar `agents-md`.

Para mantener el proyecto de alta calidad:

- Abre un issue primero para cambios no triviales.
- Incluye problema, solucion propuesta y trade-off tecnico.
- Si usaste IA, revisa manualmente el resultado antes de abrir PR.
- Manten los PRs pequenos y enfocados.
- Agrega o actualiza tests cuando cambie el comportamiento.
- Ejecuta `npm test` antes de enviar.

Comandos de desarrollo y validacion: ver seccion `## Desarrollo`.

## Soporte

Si esta herramienta te resulta util, puedes apoyar el proyecto de estas formas:

- Dar estrella al repo
- Compartirlo con tu equipo
- Reportar bugs con pasos reproducibles
- Proponer mejoras via issues o PRs acotados

## Licencia

MIT © 2026 sebasgc0399
