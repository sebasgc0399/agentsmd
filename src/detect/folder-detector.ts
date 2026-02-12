/**
 * Folder structure detection
 */

import path from 'path';
import { FolderStructure } from '../types.js';
import { directoryExists } from '../utils/fs-utils.js';

export function detectFolderStructure(rootPath: string): FolderStructure {
  const checkDir = (dir: string) => directoryExists(path.join(rootPath, dir));

  const hasSrc = checkDir('src');
  const hasFunctions = checkDir('functions');
  const hasApps = checkDir('apps');
  const hasPackages = checkDir('packages');
  const hasPublic = checkDir('public');
  const hasDocs = checkDir('docs');

  // Check for test directories (multiple common names)
  const hasTests =
    checkDir('tests') || checkDir('test') || checkDir('__tests__');

  // Monorepo detection: both apps/ and packages/ exist
  const isMonorepo = hasApps && hasPackages;

  const folders: string[] = [];
  if (hasSrc) folders.push('src');
  if (hasFunctions) folders.push('functions');
  if (hasTests) folders.push('tests');
  if (hasApps) folders.push('apps');
  if (hasPackages) folders.push('packages');
  if (hasPublic) folders.push('public');
  if (hasDocs) folders.push('docs');

  return {
    hasSrc,
    hasFunctions,
    hasTests,
    hasApps,
    hasPackages,
    hasPublic,
    hasDocs,
    isMonorepo,
    folders,
  };
}
