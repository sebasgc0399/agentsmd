/**
 * Package.json detection and parsing
 */

import { PackageInfo } from '../types.js';
import { readPackageJson } from '../utils/fs-utils.js';

export async function detectPackageInfo(rootPath: string): Promise<PackageInfo> {
  const pkg = (await readPackageJson(rootPath)) as Record<string, unknown>;

  return {
    name: (pkg.name as string) || 'unknown-project',
    version: pkg.version as string | undefined,
    description: pkg.description as string | undefined,
    type: (pkg.type as 'module' | 'commonjs') || undefined,
    scripts: (pkg.scripts as Record<string, string>) || {},
    dependencies: (pkg.dependencies as Record<string, string>) || {},
    devDependencies: (pkg.devDependencies as Record<string, string>) || {},
    engines: pkg.engines as Record<string, string> | undefined,
    workspaces: normalizeWorkspaces(pkg.workspaces),
  };
}

function normalizeWorkspaces(value: unknown): PackageInfo['workspaces'] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }

  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const packages = (value as { packages?: unknown }).packages;
  if (Array.isArray(packages)) {
    return {
      packages: packages.filter((item): item is string => typeof item === 'string'),
    };
  }

  return undefined;
}
