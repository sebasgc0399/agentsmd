# agents-md

CLI para generar archivos AGENTS.md automáticamente para proyectos Node.js.

## ¿Qué es AGENTS.md?

AGENTS.md es un "README para AI agents" que reduce las alucinaciones de agentes de IA (Claude, Copilot, Windsurf, etc.) al proporcionar:
- Comandos canónicos (setup, test, build, lint)
- Convenciones de código y estilo
- Guías de testing
- Reglas de seguridad
- Definition of Done

## Instalación

```bash
npm install -g agents-md
```

## Uso

```bash
# Generar AGENTS.md en el directorio actual
agents-md init

# Preview sin escribir archivo
agents-md init --dry-run

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
4. Genera un AGENTS.md limpio y conciso (~200-350 líneas)

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

## Licencia

MIT
