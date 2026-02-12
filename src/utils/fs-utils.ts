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
  const resolvedBase = path.resolve(basePath);
  const resolvedTarget = path.resolve(targetPath);
  return resolvedTarget.startsWith(resolvedBase);
}
