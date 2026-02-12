/**
 * Programmatic API for agents-md
 * Allows using agents-md as a library in other Node.js applications
 */

// Export main functions
export { detectProject } from './detect/index.js';
export { renderAgentsMd } from './render/index.js';

// Export detection utilities
export {
  detectPackageInfo,
  detectFolderStructure,
  detectFramework,
  detectRuntime,
  detectCommands,
} from './detect/index.js';

// Export rendering utilities
export {
  buildTemplateContext,
  renderTemplate,
  selectTemplate,
  validateOutput,
} from './render/index.js';

// Export utilities
export { estimateTokens, validateTokenCount } from './utils/token-counter.js';
export { Logger } from './utils/logger.js';

// Export types
export type {
  CLIOptions,
  PackageInfo,
  FolderStructure,
  FrameworkInfo,
  FrameworkType,
  RuntimeInfo,
  RuntimeType,
  PackageManager,
  CanonicalCommands,
  DetectionResult,
  TemplateContext,
  ValidationResult,
  GenerationResult,
} from './types.js';
