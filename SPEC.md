# SPEC: CLI Generador de AGENTS.md v1

## 1. Problema a Resolver

Los equipos que trabajan con AI coding agents (Claude Code, GitHub Copilot, Windsurf, Cline, etc.) experimentan **hallucination drift** — el agente asume comandos incorrectos, inventa scripts que no existen, o ignora convenciones establecidas del proyecto.

**AGENTS.md** es un archivo Markdown versionable que actúa como "README para agentes" y provee un contrato explícito sobre cómo trabajar en el repositorio.

**Problema actual:** La creación manual de AGENTS.md es:
- Propensa a errores (comandos desactualizados)
- Time-consuming (requiere conocimiento profundo del proyecto)
- Inconsistente (diferentes formatos entre proyectos)

**Solución:** Un CLI que genera AGENTS.md automáticamente mediante detección inteligente del proyecto.

---

## 2. Objetivos v1

- ✅ Generar AGENTS.md por perfil (`compact`, `standard`, `full`) con salida determinista
- ✅ Detección automática desde `package.json` y estructura de carpetas
- ✅ Extraer comandos canónicos REALES (no inventar scripts)
- ✅ Output determinista (mismo input = mismo output siempre)
- ✅ Seguro (no sobrescribir archivos sin confirmación)
- ✅ CLI intuitivo con flags útiles (--dry-run, --force, --verbose, --profile)
- ✅ Soportar proyectos comunes: React, Vue, Next.js, Firebase Functions, Monorepos

---

## 3. No-Objetivos v1

- ❌ NO sync/merge de AGENTS.md existentes (solo generación inicial)
- ❌ NO análisis profundo de código fuente (solo metadatos)
- ❌ NO ejecución de comandos del proyecto (solo lectura)
- ❌ NO generación de README.md (solo AGENTS.md)
- ❌ NO soporte para proyectos no-Node.js (Python, Go, Rust, etc.)
- ❌ NO validación o linting de AGENTS.md existentes

---

## 4. CLI UX

### Comando Principal

```bash
agents-md init [path]
```

**Argumentos:**
- `[path]`: Directorio del proyecto (opcional, default: `process.cwd()`)

**Flags:**

| Flag | Alias | Descripción | Default |
|------|-------|-------------|---------|
| `--out <path>` | | Ruta del archivo de salida | `./AGENTS.md` |
| `--force` | | Sobrescribir archivo existente | `false` |
| `--dry-run` | | Preview sin escribir archivo | `false` |
| `--yes` | `-y` | Saltar confirmaciones | `false` |
| `--interactive` | `-i` | Modo interactivo con prompts | `false` |
| `--profile <profile>` | | Perfil de salida: compact \| standard \| full | `compact` |
| `--verbose` | | Mostrar detalles de detección | `false` |

### Ejemplos de Uso

```bash
# Caso básico: generar en directorio actual
$ agents-md init
✓ Detected: React 18.3.0 + Vite 5.0.0
✓ Found 5 canonical commands
✓ Generated AGENTS.md (245 lines, ~950 tokens)

# Preview sin escribir
$ agents-md init --dry-run
# AGENTS.md
## Propósito del repositorio
...
[muestra contenido completo]

# Sobrescribir existente
$ agents-md init --force
⚠ AGENTS.md already exists. Overwriting...
✓ Generated AGENTS.md

# Verbose mode
$ agents-md init --verbose
→ Reading package.json...
→ Found: my-react-app v1.0.0
→ Detecting framework...
→ Found React in dependencies
→ Found Vite in devDependencies
→ Confidence: HIGH
→ Extracting commands...
  - install: npm install
  - dev: npm run dev
  - build: npm run build
  - test: npm run test
  - lint: npm run lint
→ Building template context...
→ Rendering template: react.mustache
→ Validating output...
  - Lines: 245 ✓
  - Tokens: ~950 ✓
✓ Generated AGENTS.md

# Cambiar perfil de salida
$ agents-md init --profile standard
✓ Generated AGENTS.md with profile: standard

# Ruta personalizada
$ agents-md init --out ./docs/AGENTS.md
✓ Generated ./docs/AGENTS.md
```

### Manejo de Errores

```bash
# No existe package.json
$ agents-md init
✗ Error: No package.json found. This tool requires a Node.js project.

# Archivo existe sin --force
$ agents-md init
✗ Error: AGENTS.md already exists. Use --force to overwrite.

# Path inválido
$ agents-md init /invalid/path
✗ Error: Directory not found: /invalid/path
```

---

## 5. Heurísticas de Detección

### 5.1 Requisito Mínimo

**DEBE existir `package.json`** en el directorio raíz.

Si no existe → error: `"No package.json found"`

### 5.2 Archivos Leídos

| Archivo | Qué se extrae | Obligatorio |
|---------|---------------|-------------|
| `package.json` | name, version, description, type, scripts, dependencies, devDependencies, workspaces | ✅ Sí |

**Total de archivos leídos:** 1 (solo `package.json`)

### 5.3 Carpetas Chequeadas (Solo Existencia)

El CLI **solo verifica si existen** las siguientes carpetas (NO lee contenido):

- `src/`
- `functions/`
- `tests/` o `test/` o `__tests__/`
- `apps/`
- `packages/`
- `public/`
- `docs/`

### 5.4 Lockfiles Chequeados (Detectar Package Manager)

- `yarn.lock` → package manager = `yarn`
- `pnpm-lock.yaml` → package manager = `pnpm`
- `bun.lockb` → package manager = `bun`
- Si ninguno → package manager = `npm` (default)

### 5.5 Detección de Frameworks

| Framework | Heurística | Confidence |
|-----------|------------|------------|
| **React** | `react` + `react-dom` en dependencies | HIGH |
| **Vue** | `vue` en dependencies | HIGH |
| **Next.js** | `next` en dependencies | HIGH |
| **Nuxt** | `nuxt` en dependencies | HIGH |
| **Firebase Functions** | `firebase-functions` + carpeta `functions/` | HIGH |
| **Express** | `express` en dependencies | MEDIUM |
| **Fastify** | `fastify` en dependencies | MEDIUM |

**Detección de build tools:**
- Vite: `vite` en devDependencies
- Webpack: `webpack` en devDependencies
- Turbo: `turbo` en devDependencies
- Nx: `nx` en devDependencies

**Detección de monorepo:**
- Carpetas `apps/` + `packages/` ambas existen
- O `workspaces` definido en package.json
- O `turbo` o `nx` en devDependencies

### 5.6 Extracción de Comandos Canónicos

**Lógica de extracción desde `package.json` scripts:**

| Comando | Buscar en scripts (orden de prioridad) | Fallback |
|---------|----------------------------------------|----------|
| **install** | Inferir de package manager | `npm install` |
| **dev** | `dev`, `start`, `serve` | `null` |
| **build** | `build`, `compile` | `null` |
| **test** | `test`, `test:unit`, `vitest`, `jest` | `null` |
| **lint** | `lint`, `eslint` | `null` |
| **format** | `format`, `prettier` | `null` |

**Reglas importantes:**
- Si script no existe → usar `null` (NO inventar comandos)
- Extraer nombre exacto del script, no modificar
- Si múltiples coinciden, usar el primero en la lista de prioridad

**Construcción del comando:**
```typescript
// Ejemplo: script "dev" existe
command = `${packageManager} run dev`  // → "npm run dev"

// Caso especial: "start" usa "npm start" (sin "run")
if (scriptName === 'start') {
  command = `${packageManager} start`
}
```

---

## 6. Estructura del AGENTS.md Generado

### 6.1 Secciones (en orden)

1. **Header**: `# AGENTS.md`
2. **Propósito del repositorio**: Descripción del proyecto (de package.json o placeholder)
3. **Tech stack**: Lista de tecnologías detectadas
4. **Comandos canónicos**: Comandos de setup, dev, build, test, lint, format
5. **Definition of Done**: Checklist con comandos reales
6. **Estilo y convenciones**: Defaults genéricos (framework-specific si aplica)
7. **Testing guidelines**: Solo si `test` script existe
8. **Seguridad**: Defaults universales (no hardcodear secrets, usar env vars)
9. **Footer**: Metadata de generación

### 6.2 Template Base (Mustache)

```mustache
# AGENTS.md

## Propósito del repositorio
{{project_description}}

## Tech stack
{{#stacks}}
- {{.}}
{{/stacks}}

## Comandos canónicos
- Instalar dependencias: `{{commands.install}}`
{{#has_dev}}
- Ejecutar en local: `{{commands.dev}}`
{{/has_dev}}
{{#has_build}}
- Build: `{{commands.build}}`
{{/has_build}}
{{#has_lint}}
- Lint: `{{commands.lint}}`
{{/has_lint}}
{{#has_format}}
- Format: `{{commands.format}}`
{{/has_format}}
{{#has_test}}
- Tests: `{{commands.test}}`
{{/has_test}}

## Definition of Done
Antes de considerar una tarea completa:
{{#has_test}}
- [ ] `{{commands.test}}` pasa sin errores
{{/has_test}}
{{#has_lint}}
- [ ] `{{commands.lint}}` pasa sin errores
{{/has_lint}}
- [ ] No añadir dependencias nuevas sin confirmación
- [ ] Documentar cambios en APIs públicas

## Estilo y convenciones
{{style_notes}}

{{#has_test}}
## Testing guidelines
{{testing_notes}}
{{/has_test}}

## Seguridad
{{security_notes}}

---
*Generated by agents-md v1.0.0*
```

### 6.3 Defaults Explícitos (Cuando Faltan Datos)

```typescript
const DEFAULTS = {
  project_description: '<!-- TODO: Add project description -->',

  style_notes:
    '- Seguir convenciones del framework\n' +
    '- Mantener código consistente con archivos existentes\n' +
    '- Documentar decisiones no obvias',

  testing_notes:
    '- Escribir tests para lógica de negocio\n' +
    '- Cubrir casos edge y errores\n' +
    '- Mantener tests simples y legibles',

  security_notes:
    '- No hardcodear secretos ni credenciales\n' +
    '- Usar variables de entorno para configuración sensible\n' +
    '- Validar inputs de usuario\n' +
    '- No loggear información sensible (PII, tokens, passwords)'
};
```

### 6.4 Templates Específicos de Framework

**React Template (`react.mustache`):**
- Añade: Convenciones de componentes, hooks, props naming
- Estilo: Functional components, hooks en top level

**Firebase Template (`firebase.mustache`):**
- Añade: Comandos de deploy, emuladores locales
- Seguridad: Variables de entorno, Firebase config

**Monorepo Template (`monorepo.mustache`):**
- Añade: Estructura de workspaces
- Comandos: Turbo/Nx specific commands

---

## 7. Reglas de Seguridad

### 7.1 File System Safety

- ✅ NO sobrescribir `AGENTS.md` existente sin flag `--force`
- ✅ Solo operaciones read-only durante detección
- ✅ Validar que output path esté dentro del proyecto
- ✅ NO seguir symlinks
- ✅ Limitar lectura de `package.json` a 1MB (protección contra archivos maliciosos)

### 7.2 Input Validation

- ✅ Validar que `package.json` sea JSON válido
- ✅ Manejar scripts malformados gracefully
- ✅ Sanitizar output paths (prevenir path traversal)
- ✅ No ejecutar comandos del proyecto (solo leer metadata)

### 7.3 Output Validation

- ✅ No generar código ejecutable en AGENTS.md
- ✅ Escapar caracteres especiales en comandos
- ✅ Advertir sobre scripts sospechosos (e.g., `rm -rf`)
- ✅ Validar longitud del output según profile
- ✅ Validar token count según profile

### 7.4 Determinismo

- ✅ Mismo input = mismo output (sin timestamps, sin random)
- ✅ No incluir rutas absolutas del sistema
- ✅ No incluir información del usuario
- ✅ Ordenamiento consistente de listas

---

## 8. Validación de Output

### Output Profiles & Soft Limits

- `compact`: 30-90 lines, 190-700 tokens
- `standard`: 130-190 lines, 1050-1700 tokens
- `full`: 200-280 lines, 1650-2600 tokens

Tolerancia: ±10% sobre cada borde del rango. Ver `Docs/PROFILE_LIMITS.md` para detalles de calibración.

Exceder estos rangos genera **warnings** y no bloquea la generación.
La generación solo se bloquea cuando existen **errors** de validación.

### 8.1 Métricas

| Métrica | Target | Warning | Breach (±10%) |
|---------|--------|---------|---------------|
| **Líneas (compact)** | 30-90 | <30 o >90 | <27 o >99 |
| **Tokens (compact)** | 190-700 | <190 o >700 | <171 o >770 |
| **Líneas (standard)** | 130-190 | <130 o >190 | <117 o >209 |
| **Tokens (standard)** | 1050-1700 | <1050 o >1700 | <945 o >1870 |
| **Líneas (full)** | 200-280 | <200 o >280 | <180 o >308 |
| **Tokens (full)** | 1650-2600 | <1650 o >2600 | <1485 o >2860 |
| **Secciones vacías** | 0 | >0 | — |

### 8.2 Estimación de Tokens

**Heurística:**
- Código (bloques ```): ~3 chars/token
- Texto: ~4 chars/token

```typescript
function estimateTokens(content: string): number {
  const codeBlocks = content.match(/```[\s\S]*?```/g) || [];
  const codeChars = codeBlocks.join('').length;
  const textChars = content.replace(/```[\s\S]*?```/g, '').length;

  return Math.ceil(codeChars / 3) + Math.ceil(textChars / 4);
}
```

### 8.3 Validaciones Automáticas

- [ ] No contener "undefined", "null" como strings
- [ ] No contener comandos inventados
- [ ] Todos los comandos deben venir de package.json
- [ ] Secciones con contenido real (no vacías)
- [ ] Markdown válido (headers, listas, code blocks)

---

## 9. Criterios de Aceptación

### 9.1 Build y Ejecución

- [ ] `npm install` completa sin errores
- [ ] `npm run build` compila sin errores TypeScript
- [ ] `node dist/cli.js init --help` muestra ayuda correctamente
- [ ] `npm run lint` pasa sin errores (tsc --noEmit)
- [ ] `npm test` ejecuta tests y pasan

### 9.2 Detección Correcta

**Proyecto React + Vite:**
- [ ] Detecta React 18.x
- [ ] Detecta Vite como build tool
- [ ] Extrae comandos: install, dev, build, test, lint
- [ ] Usa template `react.mustache`
- [ ] Output incluye convenciones de React

**Proyecto Firebase Functions:**
- [ ] Detecta Firebase Functions
- [ ] Detecta carpeta `functions/`
- [ ] Extrae comandos: install, serve, deploy, test
- [ ] Usa template `firebase.mustache`
- [ ] Output incluye comandos de emulador

**Monorepo:**
- [ ] Detecta carpetas `apps/` y `packages/`
- [ ] Detecta Turbo o Nx
- [ ] Marca `is_monorepo: true`
- [ ] Usa template `monorepo.mustache`

### 9.3 Output Generado

- [ ] AGENTS.md respeta límites de líneas según profile
- [ ] Comandos extraídos coinciden exactamente con `package.json`
- [ ] No contiene "undefined", "null", o comandos inventados
- [ ] Estimación de tokens respeta límites según profile
- [ ] Markdown válido (sin errores de sintaxis)

### 9.4 Flags del CLI

- [ ] `--dry-run`: Muestra output sin escribir archivo
- [ ] `--force`: Sobrescribe AGENTS.md existente
- [ ] Sin `--force`: Error si archivo existe
- [ ] `--profile`: Ajusta extensión de contenido (compact/standard/full)
- [ ] `--verbose`: Muestra logs detallados de detección
- [ ] `--out`: Escribe en ruta personalizada

### 9.5 Calidad del Código

- [ ] No errores de TypeScript
- [ ] Tests con >80% coverage (si implementados)
- [ ] README tiene ejemplos funcionales
- [ ] SPEC.md está actualizado y completo

---

## 10. Roadmap Futuro (Post-v1)

**v1.1:**
- Flag `--profile` con niveles compact/standard/full
- Detección de más frameworks (Svelte, Astro)
- Templates personalizables

**v1.2:**
- Comando `agents-md sync` para actualizar AGENTS.md existente
- Merge inteligente de cambios manuales

**v2.0:**
- Soporte para Python, Go, Rust projects
- Análisis de código fuente (opcional)
- Validación y linting de AGENTS.md existentes

---

## 11. Referencias

- **AGENTS_RESEARCH.md**: Investigación sobre AGENTS.md y convenciones
- **AGENTS_TEMPLATE.md**: Template Mustache de referencia
- **Mustache docs**: https://github.com/janl/mustache.js
- **Commander.js docs**: https://github.com/tj/commander.js

---

**Fecha de creación:** 2026-02-12
**Versión:** 1.0.0
**Estado:** ✅ Aprobado para implementación
