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

- `compact` (default): salida corta y directa (hasta ~110 lineas)
- `standard`: salida mas completa para equipos (~150-230 lineas)
- `full`: salida mas detallada para handoff y CI (~220-360 lineas)

## Limites de salida (soft limits)

- `compact`: 50-110 lines, max ~900 tokens
- `standard`: 150-230 lines, max ~1600 tokens
- `full`: 220-360 lines, max ~2400 tokens

Exceder estos rangos genera warnings y no bloquea la generacion. La generacion solo se bloquea cuando hay errors de validacion.

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

# Benchmark P1 (semantic baseline + regression budget)
npm run benchmark:p1

# Regenerar baseline P1 (solo cuando el cambio es intencional)
npm run benchmark:p1:update

# Benchmark P2 (weekly trends report, non-blocking)
npm run benchmark:p2

# Smoke del CLI compilado
node dist/cli.js init --dry-run
```

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
