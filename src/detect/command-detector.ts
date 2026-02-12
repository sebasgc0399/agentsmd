/**
 * Canonical command extraction from package.json scripts
 */

import { CanonicalCommands, PackageInfo, RuntimeInfo } from '../types.js';

export function detectCommands(
  packageInfo: PackageInfo,
  runtime: RuntimeInfo
): CanonicalCommands {
  const scripts = packageInfo.scripts || {};
  const pm = runtime.packageManager;

  // Install command (inferred from package manager)
  const install = pm === 'npm' ? 'npm install' : pm === 'yarn' ? 'yarn' : `${pm} install`;

  // Dev command (priority: dev > start > serve)
  const dev = findScript(scripts, ['dev', 'start', 'serve'], pm);

  // Build command (priority: build > compile)
  const build = findScript(scripts, ['build', 'compile'], pm);

  // Test command (priority: test > test:unit > vitest > jest)
  const test = findScript(scripts, ['test', 'test:unit', 'vitest', 'jest'], pm);

  // Lint command (priority: lint > eslint)
  const lint = findScript(scripts, ['lint', 'eslint'], pm);

  // Format command (priority: format > prettier)
  const format = findScript(scripts, ['format', 'prettier'], pm);

  return {
    install,
    dev,
    build,
    test,
    lint,
    format,
  };
}

/**
 * Find first matching script from priority list
 */
function findScript(
  scripts: Record<string, string>,
  priorities: string[],
  packageManager: string
): string | null {
  for (const scriptName of priorities) {
    if (scripts[scriptName]) {
      return buildCommand(scriptName, packageManager);
    }
  }
  return null;
}

/**
 * Build command string with package manager
 */
function buildCommand(scriptName: string, packageManager: string): string {
  // Special case: "start" and "test" don't need "run" in npm
  if ((scriptName === 'start' || scriptName === 'test') && packageManager === 'npm') {
    return `npm ${scriptName}`;
  }

  // Yarn also doesn't need "run" for built-in scripts
  if ((scriptName === 'start' || scriptName === 'test') && packageManager === 'yarn') {
    return `yarn ${scriptName}`;
  }

  // All other cases
  if (packageManager === 'npm') {
    return `npm run ${scriptName}`;
  } else if (packageManager === 'yarn') {
    return `yarn ${scriptName}`;
  } else {
    return `${packageManager} run ${scriptName}`;
  }
}
