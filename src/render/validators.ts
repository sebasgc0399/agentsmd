/**
 * Output validation
 */

import { ValidationResult } from '../types.js';
import { estimateTokens } from '../utils/token-counter.js';

/**
 * Validate generated AGENTS.md content
 */
export function validateOutput(content: string): ValidationResult {
  const lines = content.split('\n');
  const lineCount = lines.length;
  const estimatedTokens = estimateTokens(content);

  const warnings: string[] = [];
  const errors: string[] = [];

  // Line count validation (target: 200-350)
  if (lineCount < 200) {
    warnings.push(`Output is quite short (${lineCount} lines). Target: 200-350 lines.`);
  } else if (lineCount > 350) {
    warnings.push(`Output is too long (${lineCount} lines). Target: 200-350 lines.`);
  }

  // Token count validation (target: 800-1500)
  if (estimatedTokens < 800) {
    warnings.push(
      `Only ${estimatedTokens} tokens (target: 800-1500). Consider adding more details.`
    );
  } else if (estimatedTokens > 1500) {
    warnings.push(
      `${estimatedTokens} tokens exceeds budget (max: 1500). AI agents may not process it efficiently.`
    );
  }

  // Check for placeholder tokens that shouldn't be in output
  const forbiddenPlaceholders: Array<{ token: string; pattern: RegExp }> = [
    { token: 'undefined', pattern: /\bundefined\b/ },
    { token: 'null', pattern: /\bnull\b/ },
  ];
  for (const { token, pattern } of forbiddenPlaceholders) {
    if (pattern.test(content)) {
      errors.push(`Output contains forbidden placeholder string: "${token}"`);
    }
  }

  // Check for N/A commands (should use conditional rendering instead)
  const naCount = (content.match(/`N\/A`/g) || []).length;
  if (naCount > 0) {
    warnings.push(
      `Found ${naCount} N/A placeholder(s). Consider hiding missing commands.`
    );
  }

  // Check for empty sections
  const emptySectionRegex = /^##\s+.+\s*$/gm;
  const sections = content.match(emptySectionRegex) || [];
  for (const section of sections) {
    const sectionIndex = content.indexOf(section);
    const nextSectionIndex = content.indexOf('##', sectionIndex + section.length);
    const sectionContent = content.substring(
      sectionIndex + section.length,
      nextSectionIndex === -1 ? content.length : nextSectionIndex
    );

    if (sectionContent.trim().length < 10) {
      warnings.push(`Section "${section.trim()}" appears to be empty`);
    }
  }

  const valid = errors.length === 0 && warnings.length === 0;

  return {
    valid,
    warnings,
    errors,
    lineCount,
    estimatedTokens,
  };
}
