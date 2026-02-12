/**
 * Runtime and package manager detection
 */

import path from 'path';
import { RuntimeInfo, PackageInfo } from '../types.js';
import { fileExists } from '../utils/fs-utils.js';

export function detectRuntime(
  rootPath: string,
  packageInfo: PackageInfo
): RuntimeInfo {
  // Detect package manager from lockfiles
  let packageManager: RuntimeInfo['packageManager'] = 'npm';

  if (fileExists(path.join(rootPath, 'yarn.lock'))) {
    packageManager = 'yarn';
  } else if (fileExists(path.join(rootPath, 'pnpm-lock.yaml'))) {
    packageManager = 'pnpm';
  } else if (fileExists(path.join(rootPath, 'bun.lockb'))) {
    packageManager = 'bun';
  }

  // Detect runtime (Bun vs Node)
  const deps = packageInfo.dependencies || {};
  const devDeps = packageInfo.devDependencies || {};

  if (deps.bun || devDeps.bun || packageManager === 'bun') {
    return {
      type: 'bun',
      packageManager: 'bun',
      version: packageInfo.engines?.bun,
    };
  }

  // Default to Node.js
  return {
    type: 'node',
    packageManager,
    version: packageInfo.engines?.node,
  };
}
