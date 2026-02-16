/**
 * Main detection orchestrator
 */

import { DetectionResult } from '../types.js';
import { detectPackageInfo } from './package-detector.js';
import { detectFolderStructure } from './folder-detector.js';
import { detectFramework } from './framework-detector.js';
import { detectRuntime } from './runtime-detector.js';
import { detectCommands } from './command-detector.js';

export async function detectProject(rootPath: string): Promise<DetectionResult> {
  // 1. Detect package info (will throw if package.json doesn't exist)
  const packageInfo = await detectPackageInfo(rootPath);

  // 2. Detect folder structure
  const folderStructure = detectFolderStructure(rootPath, packageInfo);

  // 3. Detect framework
  const rawFramework = detectFramework(packageInfo, rootPath);
  const framework = applyFolderSignals(rawFramework, folderStructure);

  // 4. Detect runtime and package manager
  const runtime = detectRuntime(rootPath, packageInfo);

  // 5. Extract canonical commands
  const commands = detectCommands(packageInfo, runtime);

  // 6. Calculate overall confidence
  const confidence = calculateConfidence(framework, folderStructure, packageInfo);

  return {
    packageInfo,
    folderStructure,
    framework,
    runtime,
    commands,
    confidence,
  };
}

function applyFolderSignals(
  framework: DetectionResult['framework'],
  folderStructure: DetectionResult['folderStructure']
): DetectionResult['framework'] {
  if (framework.type === 'firebase-functions' && !folderStructure.hasFunctions) {
    return {
      type: 'unknown',
      confidence: 'low',
      indicators: [...framework.indicators, 'missing functions/ directory'],
    };
  }

  return framework;
}

/**
 * Calculate overall detection confidence
 */
function calculateConfidence(
  framework: DetectionResult['framework'],
  folderStructure: DetectionResult['folderStructure'],
  packageInfo: DetectionResult['packageInfo']
): 'high' | 'medium' | 'low' {
  // High confidence if:
  // - Framework detected with high confidence
  // - Has description
  // - Has multiple standard folders
  if (
    framework.confidence === 'high' &&
    packageInfo?.description &&
    folderStructure.folders.length >= 2
  ) {
    return 'high';
  }

  // Medium confidence if:
  // - Framework detected (any confidence)
  // - Has some folder structure
  if (framework.type !== 'unknown' && folderStructure.folders.length >= 1) {
    return 'medium';
  }

  // Low confidence otherwise
  return 'low';
}

// Re-export sub-modules for testing
export { detectPackageInfo } from './package-detector.js';
export { detectFolderStructure } from './folder-detector.js';
export { detectFramework } from './framework-detector.js';
export { detectRuntime } from './runtime-detector.js';
export { detectCommands } from './command-detector.js';
