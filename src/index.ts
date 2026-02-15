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
export { estimateTokens } from './utils/token-counter.js';
/**
 * @deprecated Use {@link validateOutput} with a profile parameter instead.
 * This function uses a legacy global budget (800-1500 tokens) that does not
 * correspond to current profile-specific limits.
 */
export { validateTokenCount } from './utils/token-counter.js';
export { Logger } from './utils/logger.js';

// Export types
export type {
  CLIOptions,
  WorkspaceConfig,
  PackageInfo,
  FolderStructure,
  FrameworkInfo,
  FrameworkType,
  RuntimeInfo,
  RuntimeType,
  PackageManager,
  Profile,
  CanonicalCommands,
  DetectionResult,
  TemplateContext,
  ValidationResult,
  GenerationResult,
} from './types.js';
