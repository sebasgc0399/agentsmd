/**
 * Safe file system utilities
 */

import fs from 'fs';
import path from 'path';

/**
 * Safely read package.json with size limit (1MB max)
 */
export async function readPackageJson(rootPath: string): Promise<unknown> {
  const packagePath = path.join(rootPath, 'package.json');

  // Check if file exists
  if (!fs.existsSync(packagePath)) {
    throw new Error('No package.json found');
  }

  // Check file size (max 1MB for safety)
  const stats = fs.statSync(packagePath);
  const MAX_SIZE = 1024 * 1024; // 1MB
  if (stats.size > MAX_SIZE) {
    throw new Error('package.json is too large (>1MB). This may indicate a corrupted file.');
  }

  // Read and parse
  const content = fs.readFileSync(packagePath, 'utf-8');
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error('Invalid JSON in package.json');
  }
}

/**
 * Check if a directory exists
 */
export function directoryExists(dirPath: string): boolean {
  try {
    return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Check if a file exists
 */
export function fileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

/**
 * Check if path is within project (prevent path traversal)
 */
export function isPathSafe(basePath: string, targetPath: string): boolean {
  const baseReal = resolveRealPath(path.resolve(basePath));
  if (!baseReal) {
    return false;
  }

  const targetAbsolute = path.isAbsolute(targetPath)
    ? path.resolve(targetPath)
    : path.resolve(baseReal, targetPath);

  // Outside base directory (including sibling prefix tricks like project -> project2)
  if (!isPathInside(baseReal, targetAbsolute)) {
    return false;
  }

  // Best-effort symlink guard: only block symlinks that resolve outside project root.
  const relativeToBase = path.relative(baseReal, targetAbsolute);
  if (hasExternalSymlinkInExistingSegments(baseReal, relativeToBase)) {
    return false;
  }

  return true;
}

function resolveRealPath(value: string): string | null {
  try {
    return fs.realpathSync(value);
  } catch {
    return null;
  }
}

function normalizePathForComparison(value: string): string {
  const normalized = path.normalize(value);
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

function isPathInside(basePath: string, targetPath: string): boolean {
  const resolvedBase = normalizePathForComparison(path.resolve(basePath));
  const resolvedTarget = normalizePathForComparison(path.resolve(targetPath));
  const relative = path.relative(resolvedBase, resolvedTarget);
  const escapes =
    relative === '..' ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative);

  return !escapes;
}

function hasExternalSymlinkInExistingSegments(
  basePath: string,
  relativePath: string
): boolean {
  if (!relativePath) {
    return false;
  }

  const segments = relativePath.split(path.sep).filter(Boolean);
  let current = basePath;

  for (const segment of segments) {
    current = path.join(current, segment);

    if (!fs.existsSync(current)) {
      break;
    }

    try {
      if (fs.lstatSync(current).isSymbolicLink()) {
        const symlinkReal = resolveRealPath(current);
        if (!symlinkReal || !isPathInside(basePath, symlinkReal)) {
          return true;
        }
      }
    } catch {
      // Fail closed if metadata cannot be read.
      return true;
    }
  }

  return false;
}
