/**
 * Build template context from detection results
 */

import { DetectionResult, TemplateContext, PackageInfo, Profile } from '../types.js';
import { detectBuildTools } from '../detect/framework-detector.js';
import { getPackageVersion } from '../utils/version.js';

/**
 * Default values when data is missing
 */
const DEFAULTS = {
  project_description:
    'Proyecto sin descripcion en package.json. Definir objetivo y alcance antes de cambios amplios.',

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
    '- No loggear información sensible (PII, tokens, passwords)',
};

/**
 * Build framework-specific style notes
 */
function buildStyleNotes(framework: DetectionResult['framework']): string {
  switch (framework.type) {
    case 'react':
      return (
        DEFAULTS.style_notes +
        '\n- Preferir componentes funcionales con hooks\n' +
        '- Props naming: camelCase, event handlers con "on" prefix\n' +
        '- Hooks en top-level del componente'
      );

    case 'vue':
      return (
        DEFAULTS.style_notes +
        '\n- Usar <script setup> (Composition API) como sintaxis recomendada\n' +
        '- Props con defineProps, eventos con defineEmits\n' +
        '- Componentes en PascalCase, un componente por archivo\n' +
        '- Composables en composables/ con prefijo use'
      );

    case 'nuxt':
      return (
        DEFAULTS.style_notes +
        '\n- Usar Composition API (<script setup>) y defineProps/defineEmits\n' +
        '- Auto-imports de Nuxt: components/, composables/, utils/\n' +
        '- Páginas en pages/, layouts, middleware, server routes en server/api/\n' +
        '- Data fetching con useFetch/useAsyncData'
      );

    case 'angular':
      return (
        DEFAULTS.style_notes +
        '\n- Standalone Components preferidos sobre NgModules (Angular 17+)\n' +
        '- Archivos: dash-case con sufijos (.component.ts, .service.ts)\n' +
        '- DI con providedIn: root; Signals para estado local, RxJS para streams async\n' +
        '- OnPush change detection; control flow con @if, @for, @switch'
      );

    case 'svelte':
    case 'sveltekit':
      return (
        DEFAULTS.style_notes +
        '\n- Svelte 5 runes: $state(), $derived(), $effect() para reactividad\n' +
        '- Estructura SvelteKit: src/routes/, src/lib/ ($lib alias)\n' +
        '- Stores con writable()/derived() en src/lib/stores.ts'
      );

    case 'astro':
      return (
        DEFAULTS.style_notes +
        '\n- src/pages/ para rutas, src/components/, src/layouts/, src/content/\n' +
        '- Componentes estáticos por defecto; usar client:* para interactividad (Islands)\n' +
        '- Content Collections via getCollection() en archivos de ruta'
      );

    case 'nestjs':
      return (
        DEFAULTS.style_notes +
        '\n- Decoradores: @Controller, @Injectable, @Module, @Get/@Post\n' +
        '- Módulos por feature con controllers, services, exports\n' +
        '- Pipes (ValidationPipe), Guards, Interceptors para cross-cutting concerns\n' +
        '- DI en constructor; @Inject() solo para tokens custom'
      );

    case 'express':
      return (
        DEFAULTS.style_notes +
        '\n- Agrupar rutas con express.Router() por área\n' +
        '- Orden de middleware importa: genéricos antes de rutas, error handler al final\n' +
        '- Error handler: función de 4 parámetros (err, req, res, next)'
      );

    case 'fastify':
      return (
        DEFAULTS.style_notes +
        '\n- Sistema de plugins con fastify.register(); cada plugin tiene scope encapsulado\n' +
        '- JSON Schema validation en rutas (schema.body, schema.querystring)\n' +
        '- Usar logger integrado (fastify.log), no console.log'
      );

    case 'firebase-functions':
      return (
        DEFAULTS.style_notes +
        '\n- Funciones idempotentes y stateless\n' +
        '- Manejar cold starts (minimizar dependencias)\n' +
        '- Usar Firebase Admin SDK para operaciones backend'
      );

    default:
      return DEFAULTS.style_notes;
  }
}

/**
 * Build framework-specific testing notes
 */
function buildTestingNotes(
  framework: DetectionResult['framework'],
  packageInfo: PackageInfo | null
): string {
  const devDeps = packageInfo?.devDependencies || {};

  let notes = DEFAULTS.testing_notes;

  // Add framework-specific testing patterns
  if (framework.type === 'react' && devDeps['@testing-library/react']) {
    notes += '\n- Usar React Testing Library para tests de componentes\n';
    notes += '- Preferir queries por rol y texto sobre testIds';
  }

  if ((framework.type === 'vue' || framework.type === 'nuxt') && devDeps['@testing-library/vue']) {
    notes += '\n- Usar @testing-library/vue para tests de componentes';
  }
  if ((framework.type === 'vue' || framework.type === 'nuxt') && devDeps['@vue/test-utils']) {
    notes += '\n- Vue Test Utils (VTU) para tests de componentes';
  }

  if (framework.type === 'angular') {
    notes += '\n- TestBed.configureTestingModule para setup de tests\n';
    notes += '- Mock services con useClass/useValue en providers';
  }

  if ((framework.type === 'svelte' || framework.type === 'sveltekit') && devDeps['@testing-library/svelte']) {
    notes += '\n- @testing-library/svelte para tests de componentes';
  }

  if (framework.type === 'nestjs' && devDeps['@nestjs/testing']) {
    notes += '\n- Test.createTestingModule para setup; module.get() para extraer servicios\n';
    notes += '- E2E con createNestApplication() + supertest';
  }

  if (framework.type === 'express' && devDeps['supertest']) {
    notes += '\n- supertest para tests HTTP sin levantar servidor real';
  }

  if (framework.type === 'fastify') {
    notes += '\n- fastify.inject() para tests de rutas sin servidor real';
  }

  if (devDeps.vitest) {
    notes += '\n- Framework de testing: Vitest';
  } else if (devDeps.jest) {
    notes += '\n- Framework de testing: Jest';
  }

  return notes;
}

/**
 * Build framework-specific security notes
 */
function buildSecurityNotes(framework: DetectionResult['framework']): string {
  switch (framework.type) {
    case 'vue':
    case 'nuxt':
      return (
        DEFAULTS.security_notes +
        '\n- No usar v-html con contenido no sanitizado (riesgo XSS)\n' +
        '- No exponer variables sensibles en código cliente'
      );

    case 'angular':
      return (
        DEFAULTS.security_notes +
        '\n- bypassSecurityTrust* solo tras validar seguridad del contenido\n' +
        '- CSP con ngCspNonce o autoCsp para scripts/estilos'
      );

    case 'nestjs':
      return (
        DEFAULTS.security_notes +
        '\n- ValidationPipe global (transform: true, whitelist: true)\n' +
        '- No exponer stack traces en respuestas de producción'
      );

    case 'express':
      return (
        DEFAULTS.security_notes +
        '\n- Usar helmet() para headers de seguridad\n' +
        '- express-rate-limit para prevenir abuso'
      );

    case 'fastify':
      return (
        DEFAULTS.security_notes +
        '\n- @fastify/helmet para headers de seguridad\n' +
        '- @fastify/rate-limit para prevenir abuso'
      );

    default:
      return DEFAULTS.security_notes;
  }
}

/**
 * Build tech stack list
 */
function buildStackList(
  packageInfo: PackageInfo | null,
  framework: DetectionResult['framework'],
  runtime: DetectionResult['runtime']
): string[] {
  const stacks: string[] = [];

  // Runtime
  if (runtime.type === 'node') {
    const version = runtime.version ? ` ${runtime.version}` : '';
    stacks.push(`Node.js${version}`);
  } else if (runtime.type === 'bun') {
    stacks.push('Bun');
  }

  // Package manager (if not npm)
  if (runtime.packageManager !== 'npm') {
    stacks.push(`Package manager: ${runtime.packageManager}`);
  }

  // Framework
  if (framework.type !== 'unknown') {
    const version = framework.version ? ` ${framework.version}` : '';
    const frameworkName = framework.type.charAt(0).toUpperCase() + framework.type.slice(1);
    stacks.push(`${frameworkName}${version}`);
  }

  // Build tools
  if (packageInfo) {
    const buildTools = detectBuildTools(packageInfo);
    stacks.push(...buildTools.map(tool => `Build tool: ${tool}`));
  }

  // TypeScript
  if (packageInfo?.devDependencies?.typescript || packageInfo?.dependencies?.typescript) {
    stacks.push('TypeScript');
  }

  return stacks.length > 0 ? stacks : ['Node.js'];
}

/**
 * Build template context from detection result
 */
export function buildTemplateContext(
  detection: DetectionResult,
  profile: Profile = 'compact'
): TemplateContext {
  const { packageInfo, folderStructure, framework, runtime, commands } = detection;

  const stacks = buildStackList(packageInfo, framework, runtime);
  const description = packageInfo?.description || DEFAULTS.project_description;
  const styleNotes = buildStyleNotes(framework);
  const testingNotes = buildTestingNotes(framework, packageInfo);
  const securityNotes = buildSecurityNotes(framework);

  return {
    project_name: packageInfo?.name || 'unknown-project',
    project_description: description,
    generator_version: getPackageVersion(),
    profile,
    stacks,
    commands: {
      install: commands.install,
      dev: commands.dev || 'N/A',
      build: commands.build || 'N/A',
      test: commands.test || 'N/A',
      lint: commands.lint || 'N/A',
      format: commands.format || 'N/A',
    },
    style_notes: styleNotes,
    testing_notes: testingNotes,
    security_notes: securityNotes,
    has_dev: commands.dev !== null,
    has_tests: commands.test !== null,
    has_lint: commands.lint !== null,
    has_format: commands.format !== null,
    has_build: commands.build !== null,
    is_monorepo: folderStructure.isMonorepo,
    isCompact: profile === 'compact',
    isStandard: profile === 'standard',
    isFull: profile === 'full',
    isStandardOrFull: profile === 'standard' || profile === 'full',
    is_unknown_generic: framework.type === 'unknown' && !folderStructure.isMonorepo,
    is_nuxt: framework.type === 'nuxt',
    framework_type: framework.type,
    runtime_type: runtime.type,
  };
}
