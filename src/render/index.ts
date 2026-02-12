/**
 * Main rendering module
 */

import { DetectionResult, GenerationResult } from '../types.js';
import { buildTemplateContext } from './data-builder.js';
import { renderTemplate, selectTemplate } from './mustache-renderer.js';
import { validateOutput } from './validators.js';

/**
 * Render AGENTS.md from detection result
 */
export function renderAgentsMd(detection: DetectionResult): GenerationResult {
  // Build template context
  const context = buildTemplateContext(detection);

  // Select appropriate template
  const templateName = selectTemplate(context);

  // Render template
  const content = renderTemplate(templateName, context);

  // Validate output
  const validation = validateOutput(content);

  return {
    content,
    validation,
    detection,
  };
}

// Re-export sub-modules for testing
export { buildTemplateContext } from './data-builder.js';
export { renderTemplate, selectTemplate } from './mustache-renderer.js';
export { validateOutput } from './validators.js';
