import { describe, expect, it } from 'vitest';
import { buildTemplateContext } from '../../src/render/index.js';
import { DetectionResult, PackageInfo } from '../../src/types.js';

type DetectionOverrides = {
  packageInfo?: Partial<PackageInfo> | null;
  folderStructure?: Partial<DetectionResult['folderStructure']>;
  framework?: Partial<DetectionResult['framework']>;
  runtime?: Partial<DetectionResult['runtime']>;
  commands?: Partial<DetectionResult['commands']>;
  confidence?: DetectionResult['confidence'];
};

function createPackageInfo(overrides: Partial<PackageInfo> = {}): PackageInfo {
  const {
    scripts,
    dependencies,
    devDependencies,
    ...rest
  } = overrides;

  return {
    name: 'demo-project',
    ...rest,
    scripts: scripts ?? {},
    dependencies: dependencies ?? {},
    devDependencies: devDependencies ?? {},
  };
}

function createDetection(overrides: DetectionOverrides = {}): DetectionResult {
  const basePackageInfo = createPackageInfo();
  const packageInfo =
    overrides.packageInfo === undefined
      ? basePackageInfo
      : overrides.packageInfo === null
        ? null
        : createPackageInfo(overrides.packageInfo);

  return {
    packageInfo,
    folderStructure: {
      hasSrc: true,
      hasFunctions: false,
      hasTests: true,
      hasApps: false,
      hasPackages: false,
      hasPublic: false,
      hasDocs: false,
      isMonorepo: false,
      folders: ['src', 'tests'],
      ...(overrides.folderStructure ?? {}),
    },
    framework: {
      type: 'unknown',
      confidence: 'low',
      indicators: ['none'],
      ...(overrides.framework ?? {}),
    },
    runtime: {
      type: 'node',
      packageManager: 'npm',
      ...(overrides.runtime ?? {}),
    },
    commands: {
      install: 'npm install',
      dev: 'npm run dev',
      build: 'npm run build',
      test: 'npm test',
      lint: 'npm run lint',
      format: 'npm run format',
      ...(overrides.commands ?? {}),
    },
    confidence: overrides.confidence ?? 'high',
  };
}

describe('buildTemplateContext', () => {
  it('adds firebase-specific style notes for firebase-functions', () => {
    const detection = createDetection({
      framework: { type: 'firebase-functions', confidence: 'high' },
    });

    const context = buildTemplateContext(detection, 'compact');

    expect(context.style_notes).toContain('Funciones idempotentes y stateless');
    expect(context.style_notes).toContain('Manejar cold starts');
    expect(context.style_notes).toContain('Firebase Admin SDK');
  });

  it('adds react testing-library notes and prefers Vitest when both react+rtl+vitest are present', () => {
    const detection = createDetection({
      framework: { type: 'react', confidence: 'high', version: '^18.0.0' },
      packageInfo: {
        devDependencies: {
          '@testing-library/react': '^14.0.0',
          vitest: '^1.0.0',
        },
      },
    });

    const context = buildTemplateContext(detection, 'compact');

    expect(context.testing_notes).toContain('React Testing Library');
    expect(context.testing_notes).toContain('queries por rol y texto');
    expect(context.testing_notes).toContain('Framework de testing: Vitest');
  });

  it('uses Jest note when vitest is absent but jest is present', () => {
    const detection = createDetection({
      framework: { type: 'react', confidence: 'high', version: '^18.0.0' },
      packageInfo: {
        devDependencies: {
          '@testing-library/react': '^14.0.0',
          jest: '^29.0.0',
        },
      },
    });

    const context = buildTemplateContext(detection, 'compact');

    expect(context.testing_notes).toContain('Framework de testing: Jest');
    expect(context.testing_notes).not.toContain('Framework de testing: Vitest');
  });

  it('keeps base testing notes when non-react project has no vitest/jest', () => {
    const detection = createDetection({
      framework: { type: 'vue', confidence: 'high', version: '^3.0.0' },
      packageInfo: { devDependencies: {} },
    });

    const context = buildTemplateContext(detection, 'compact');

    expect(context.testing_notes).not.toContain('Framework de testing:');
    expect(context.testing_notes).toContain('Mantener tests simples y legibles');
  });

  it('includes Bun in stack list when runtime is bun', () => {
    const detection = createDetection({
      runtime: { type: 'bun', packageManager: 'bun' },
    });

    const context = buildTemplateContext(detection, 'compact');

    expect(context.stacks).toContain('Bun');
  });

  it('includes package manager when runtime package manager is not npm', () => {
    const detection = createDetection({
      runtime: { packageManager: 'pnpm' },
    });

    const context = buildTemplateContext(detection, 'compact');

    expect(context.stacks).toContain('Package manager: pnpm');
  });

  it('does not add framework stack entry when framework is unknown', () => {
    const detection = createDetection({
      framework: { type: 'unknown', confidence: 'low' },
    });

    const context = buildTemplateContext(detection, 'compact');

    expect(context.stacks.some(item => item.startsWith('Unknown'))).toBe(false);
  });

  it('adds known framework entry with capitalized name and version', () => {
    const detection = createDetection({
      framework: { type: 'nuxt', confidence: 'high', version: '^3.12.0' },
    });

    const context = buildTemplateContext(detection, 'compact');

    expect(context.stacks).toContain('Nuxt ^3.12.0');
  });

  it('falls back to Node.js stack when packageInfo is null and no runtime/framework signals exist', () => {
    const detection = createDetection({
      packageInfo: null,
      runtime: { type: 'unknown', packageManager: 'npm' },
      framework: { type: 'unknown', confidence: 'low' },
    });

    const context = buildTemplateContext(detection, 'compact');

    expect(context.stacks).toEqual(['Node.js']);
  });

  it('detects TypeScript from dependencies', () => {
    const detection = createDetection({
      packageInfo: {
        dependencies: { typescript: '^5.0.0' },
      },
    });

    const context = buildTemplateContext(detection, 'compact');

    expect(context.stacks).toContain('TypeScript');
  });

  it('detects TypeScript from devDependencies', () => {
    const detection = createDetection({
      packageInfo: {
        devDependencies: { typescript: '^5.0.0' },
      },
    });

    const context = buildTemplateContext(detection, 'compact');

    expect(context.stacks).toContain('TypeScript');
  });

  it('includes build tools in stable order from detectBuildTools', () => {
    const detection = createDetection({
      packageInfo: {
        devDependencies: {
          turbo: '^2.0.0',
          vite: '^5.0.0',
          nx: '^19.0.0',
        },
      },
    });

    const context = buildTemplateContext(detection, 'compact');

    expect(context.stacks).toContain('Build tool: Vite');
    expect(context.stacks).toContain('Build tool: Turbo');
    expect(context.stacks).toContain('Build tool: Nx');
    expect(context.stacks.indexOf('Build tool: Vite')).toBeLessThan(
      context.stacks.indexOf('Build tool: Turbo')
    );
    expect(context.stacks.indexOf('Build tool: Turbo')).toBeLessThan(
      context.stacks.indexOf('Build tool: Nx')
    );
  });

  it('falls back missing commands to N/A and marks has_* flags as false', () => {
    const detection = createDetection({
      commands: {
        dev: null,
        build: null,
        test: null,
        lint: null,
        format: null,
      },
    });

    const context = buildTemplateContext(detection, 'compact');

    expect(context.commands.dev).toBe('N/A');
    expect(context.commands.build).toBe('N/A');
    expect(context.commands.test).toBe('N/A');
    expect(context.commands.lint).toBe('N/A');
    expect(context.commands.format).toBe('N/A');
    expect(context.has_dev).toBe(false);
    expect(context.has_build).toBe(false);
    expect(context.has_tests).toBe(false);
    expect(context.has_lint).toBe(false);
    expect(context.has_format).toBe(false);
  });

  it('sets profile flags correctly for compact, standard and full', () => {
    const detection = createDetection();

    const compact = buildTemplateContext(detection, 'compact');
    expect(compact.isCompact).toBe(true);
    expect(compact.isStandard).toBe(false);
    expect(compact.isFull).toBe(false);
    expect(compact.isStandardOrFull).toBe(false);

    const standard = buildTemplateContext(detection, 'standard');
    expect(standard.isCompact).toBe(false);
    expect(standard.isStandard).toBe(true);
    expect(standard.isFull).toBe(false);
    expect(standard.isStandardOrFull).toBe(true);

    const full = buildTemplateContext(detection, 'full');
    expect(full.isCompact).toBe(false);
    expect(full.isStandard).toBe(false);
    expect(full.isFull).toBe(true);
    expect(full.isStandardOrFull).toBe(true);
  });

  it('uses fallback project_name and project_description when package info misses them', () => {
    const detection = createDetection({
      packageInfo: {
        name: '',
        description: '',
      },
    });

    const context = buildTemplateContext(detection, 'compact');

    expect(context.project_name).toBe('unknown-project');
    expect(context.project_description).toContain('Proyecto sin descripcion');
  });

  it('sets is_unknown_generic to true only for unknown non-monorepo projects', () => {
    const unknownSingle = createDetection({
      framework: { type: 'unknown', confidence: 'low' },
      folderStructure: { isMonorepo: false },
    });
    const unknownMonorepo = createDetection({
      framework: { type: 'unknown', confidence: 'low' },
      folderStructure: { isMonorepo: true },
    });

    expect(buildTemplateContext(unknownSingle, 'compact').is_unknown_generic).toBe(true);
    expect(buildTemplateContext(unknownMonorepo, 'compact').is_unknown_generic).toBe(false);
  });
});
