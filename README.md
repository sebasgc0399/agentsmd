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

**Uso sin instalación** (recomendado):

```bash
# Generar AGENTS.md en el directorio actual
npx @sebasgc0399/agents-md init

# Preview sin escribir archivo
npx @sebasgc0399/agents-md init --dry-run

# Elegir perfil de salida
npx @sebasgc0399/agents-md init --profile compact    # ~70 líneas (default)
npx @sebasgc0399/agents-md init --profile standard   # ~150 líneas
npx @sebasgc0399/agents-md init --profile full       # ~220 líneas
```

## Instalación

**Opción 1: Sin instalación (npx)**
```bash
npx @sebasgc0399/agents-md init
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

# Lint (verificar tipos)
npm run lint
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

## Soporte

Si esta herramienta te resulta útil, puedes apoyar el proyecto de estas formas:

- Dar estrella al repo
- Compartirlo con tu equipo
- Reportar bugs con pasos reproducibles
- Proponer mejoras vía issues o PRs bien acotados

## License

MIT © 2026 sebasgc0399
