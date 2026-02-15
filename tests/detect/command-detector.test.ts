import { describe, expect, it } from 'vitest';
import { detectCommands } from '../../src/detect/command-detector.js';
import { PackageInfo, RuntimeInfo } from '../../src/types.js';

function createPackageInfo(scripts: Record<string, string>): PackageInfo {
  return {
    name: 'test-project',
    scripts,
    dependencies: {},
    devDependencies: {},
  };
}

function createRuntime(
  packageManager: RuntimeInfo['packageManager']
): RuntimeInfo {
  return {
    type: packageManager === 'bun' ? 'bun' : 'node',
    packageManager,
  };
}

describe('detectCommands', () => {
  it('builds install command from package manager without inventing scripts', () => {
    const packageInfo = createPackageInfo({});

    expect(detectCommands(packageInfo, createRuntime('npm')).install).toBe('npm install');
    expect(detectCommands(packageInfo, createRuntime('yarn')).install).toBe('yarn');
    expect(detectCommands(packageInfo, createRuntime('pnpm')).install).toBe('pnpm install');
    expect(detectCommands(packageInfo, createRuntime('bun')).install).toBe('bun install');
  });

  it('uses script priorities for dev and build commands', () => {
    const packageInfo = createPackageInfo({
      start: 'node server.js',
      serve: 'vite preview',
      compile: 'tsc -p .',
      build: 'vite build',
    });
    const commands = detectCommands(packageInfo, createRuntime('npm'));

    expect(commands.dev).toBe('npm start');
    expect(commands.build).toBe('npm run build');
  });

  it('uses script priorities for test, lint and format commands', () => {
    const packageInfo = createPackageInfo({
      'test:unit': 'vitest',
      vitest: 'vitest run',
      jest: 'jest',
      eslint: 'eslint .',
      prettier: 'prettier --check .',
    });
    const commands = detectCommands(packageInfo, createRuntime('npm'));

    expect(commands.test).toBe('npm run test:unit');
    expect(commands.lint).toBe('npm run eslint');
    expect(commands.format).toBe('npm run prettier');
  });

  it('uses npm and yarn special-case syntax for start and test', () => {
    const packageInfo = createPackageInfo({
      start: 'node server.js',
      test: 'vitest run',
    });

    const npmCommands = detectCommands(packageInfo, createRuntime('npm'));
    const yarnCommands = detectCommands(packageInfo, createRuntime('yarn'));

    expect(npmCommands.dev).toBe('npm start');
    expect(npmCommands.test).toBe('npm test');
    expect(yarnCommands.dev).toBe('yarn start');
    expect(yarnCommands.test).toBe('yarn test');
  });

  it('uses yarn syntax for non-builtin scripts', () => {
    const packageInfo = createPackageInfo({
      build: 'vite build',
    });
    const commands = detectCommands(packageInfo, createRuntime('yarn'));

    expect(commands.build).toBe('yarn build');
  });

  it('uses run syntax for non npm/yarn package managers', () => {
    const packageInfo = createPackageInfo({
      build: 'tsc -p .',
    });
    const commands = detectCommands(packageInfo, createRuntime('pnpm'));

    expect(commands.build).toBe('pnpm run build');
  });

  it('returns null when canonical scripts are missing', () => {
    const packageInfo = createPackageInfo({
      custom: 'echo custom',
    });
    const commands = detectCommands(packageInfo, createRuntime('npm'));

    expect(commands.dev).toBeNull();
    expect(commands.build).toBeNull();
    expect(commands.test).toBeNull();
    expect(commands.lint).toBeNull();
    expect(commands.format).toBeNull();
  });
});
