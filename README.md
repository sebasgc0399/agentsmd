# agents-md

CLI para generar archivos AGENTS.md automáticamente para proyectos Node.js.

## ¿Qué es AGENTS.md?

AGENTS.md es un "README para AI agents" que reduce las alucinaciones de agentes de IA (Claude, Copilot, Windsurf, etc.) al proporcionar:
- Comandos canónicos (setup, test, build, lint)
- Convenciones de código y estilo
- Guías de testing
- Reglas de seguridad
- Definition of Done

## Quickstart

**Nombres importantes (evitar confusiones):**
- **Package en npm:** `@sebasgc0399/agents-md`
- **Bin/command instalado:** `agents-md`
- No usar `npx agents-md ...` (sin scope), porque puede ejecutar otro paquete distinto en npm.

**Uso sin instalación** (recomendado):

```bash
# Generar AGENTS.md en el directorio actual
npx -p @sebasgc0399/agents-md agents-md init

# Preview sin escribir archivo
npx -p @sebasgc0399/agents-md agents-md init --dry-run

# Elegir perfil de salida
npx -p @sebasgc0399/agents-md agents-md init --profile compact    # ~70 líneas (default)
npx -p @sebasgc0399/agents-md agents-md init --profile standard   # ~150 líneas
npx -p @sebasgc0399/agents-md agents-md init --profile full       # ~220 líneas
```

## Instalación

**Opción 1: Sin instalación (npx)**
```bash
npx -p @sebasgc0399/agents-md agents-md init
```

**Opción 2: Instalación global**
```bash
npm install -g @sebasgc0399/agents-md
agents-md init
```

**Requisitos**: Node.js ≥18

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

# Modo verbose (mostrar detalles de detección)
agents-md init --verbose

# Especificar ruta de salida
agents-md init --out ./docs/AGENTS.md
```

Nota: en la version `v0.2.x`, las flags `-y/--yes` y `-i/--interactive`
estan reservadas y actualmente no cambian el comportamiento del comando.

## Proyectos Soportados

- React (con Vite, CRA, o Next.js)
- Vue (con Vite o Nuxt)
- Firebase Functions
- Proyectos Node.js genéricos
- Monorepos (Turborepo/Nx)

## Cómo Funciona

1. Lee tu `package.json`
2. Detecta framework y estructura de carpetas
3. Extrae comandos canónicos desde scripts
4. Genera un AGENTS.md limpio y conciso según el profile seleccionado

## Profiles de salida

- `compact` (default): salida corta y directa (hasta ~110 líneas)
- `standard`: salida más completa para equipos (~150-230 líneas)
- `full`: salida más detallada para handoff y CI (~220-360 líneas)

## Output Profiles & Soft Limits

- `compact`: 50-110 lines, max ~900 tokens
- `standard`: 150-230 lines, max ~1600 tokens
- `full`: 220-360 lines, max ~2400 tokens

Exceder estos rangos genera **warnings** y no bloquea la generación.
La generación solo se bloquea cuando hay **errors** de validación.

## Requisitos

- Node.js 18+
- `package.json` en la raíz del proyecto

## 📦 Releases y Novedades

**Version actual: v0.2.0**

### Cambios en esta versión:
- Benchmark de calidad P0/P1/P2 integrado (`benchmark:lite`, `benchmark:p1`, `benchmark:p2`)
- Gates de calidad en CI para benchmark lite + baseline semantico P1
- Workflow semanal/manual de tendencias (`benchmark-trends`) con reporte JSON/Markdown

> **💡 Actualizar a la última versión:**
> Si tienes instalada una versión anterior globalmente, actualiza con:
> ```bash
> npm update -g @sebasgc0399/agents-md
> ```

[Ver el historial completo de versiones](https://github.com/sebasgc0399/agents-md/releases)

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

Gracias por ayudar a mejorar **agents-md**: las contribuciones son bienvenidas.

Para mantener el proyecto de alta calidad y fácil de mantener, por favor:

- **Abre un issue primero** para cambios no triviales (nuevas funcionalidades, cambios de comportamiento, expansiones de templates).
- Incluye un **planteamiento claro del problema**, una **solución propuesta** y **por qué** es el mejor trade-off.
- Si usaste un asistente de IA, está perfecto: asegúrate de que el resultado esté **revisado por ti**, probado en local y alineado con las convenciones del repo.  
  En otras palabras: la IA puede ayudarte a ir más rápido, pero el PR debe reflejar **tu criterio de ingeniería**.
- Mantén los PRs **pequeños y enfocados** cuando sea posible.
- Agrega o actualiza **tests** cuando cambie el comportamiento.
- Ejecuta `npm test` antes de enviar.

### Desarrollo

- Instalar: `npm install`
- Build: `npm run build`
- Test: `npm test`
- Coverage: `npm run test:coverage`
- Benchmark lite: `npm run benchmark:lite`
- Benchmark P1: `npm run benchmark:p1`
- Update baseline P1: `npm run benchmark:p1:update`
- Benchmark P2 trends (no gate de PR): `npm run benchmark:p2`

## Soporte

Si esta herramienta te resulta útil, puedes apoyar el proyecto de estas formas:

- Dar estrella al repo
- Compartirlo con tu equipo
- Reportar bugs con pasos reproducibles
- Proponer mejoras vía issues o PRs bien acotados

## License

MIT © 2026 sebasgc0399
