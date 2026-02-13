/**
 * Folder structure detection
 */

import path from 'path';
import { FolderStructure, PackageInfo } from '../types.js';
import { directoryExists, fileExists } from '../utils/fs-utils.js';

export function detectFolderStructure(
  rootPath: string,
  packageInfo?: PackageInfo | null
): FolderStructure {
  const checkDir = (dir: string) => directoryExists(path.join(rootPath, dir));
  const checkFile = (fileName: string) => fileExists(path.join(rootPath, fileName));

  const hasSrc = checkDir('src');
  const hasFunctions = checkDir('functions');
  const hasApps = checkDir('apps');
  const hasPackages = checkDir('packages');
  const hasPublic = checkDir('public');
  const hasDocs = checkDir('docs');

  // Check for test directories (multiple common names)
  const hasTests =
    checkDir('tests') || checkDir('test') || checkDir('__tests__');

  const hasWorkspaces = hasWorkspaceDefinition(packageInfo?.workspaces);
  const hasMonorepoTool =
    Boolean(packageInfo?.devDependencies?.turbo) ||
    Boolean(packageInfo?.devDependencies?.nx);
  const hasMonorepoToolWithFolderHints =
    hasMonorepoTool && (hasApps || hasPackages);
  const hasMonorepoMarkers =
    checkFile('pnpm-workspace.yaml') ||
    checkFile('turbo.json') ||
    checkFile('nx.json') ||
    checkFile('lerna.json');

  // Monorepo signals: folder structure, workspaces, tools, or marker files.
  const isMonorepo =
    (hasApps && hasPackages) ||
    hasWorkspaces ||
    hasMonorepoToolWithFolderHints ||
    hasMonorepoMarkers;

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

function hasWorkspaceDefinition(workspaces: PackageInfo['workspaces']): boolean {
  if (!workspaces) {
    return false;
  }

  if (Array.isArray(workspaces)) {
    return workspaces.length > 0;
  }

  if (Array.isArray(workspaces.packages)) {
    return workspaces.packages.length > 0;
  }

  return false;
}
