/**
 * Build template context from detection results
 */

import { DetectionResult, TemplateContext, PackageInfo, Profile } from '../types.js';
import { detectBuildTools } from '../detect/framework-detector.js';

/**
 * Default values when data is missing
 */
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
        '\n- Usar Composition API (setup script)\n' +
        '- Props con defineProps, eventos con defineEmits\n' +
        '- Componentes en PascalCase'
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

  if (devDeps.vitest) {
    notes += '\n- Framework de testing: Vitest';
  } else if (devDeps.jest) {
    notes += '\n- Framework de testing: Jest';
  }

  return notes;
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

  return {
    project_name: packageInfo?.name || 'unknown-project',
    project_description: description,
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
    security_notes: DEFAULTS.security_notes,
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
    framework_type: framework.type,
    runtime_type: runtime.type,
  };
}
