/**
 * Output validation
 */

import { Profile, ValidationResult } from '../types.js';
import { estimateTokens } from '../utils/token-counter.js';

const PROFILE_LIMITS: Record<
  Profile,
  {
    targetMinLines: number;
    targetMaxLines: number;
    targetMinTokens: number;
    targetMaxTokens: number;
    tolerancePct: number;
  }
> = {
  compact: {
    targetMinLines: 30,
    targetMaxLines: 90,
    targetMinTokens: 190,
    targetMaxTokens: 700,
    tolerancePct: 0.1,
  },
  standard: {
    targetMinLines: 130,
    targetMaxLines: 190,
    targetMinTokens: 1050,
    targetMaxTokens: 1700,
    tolerancePct: 0.1,
  },
  full: {
    targetMinLines: 200,
    targetMaxLines: 280,
    targetMinTokens: 1650,
    targetMaxTokens: 2600,
    tolerancePct: 0.1,
  },
};

function getToleratedBounds(min: number, max: number, tolerancePct: number): {
  min: number;
  max: number;
} {
  const epsilon = 1e-9;
  return {
    min: Math.floor(min * (1 - tolerancePct) + epsilon),
    max: Math.ceil(max * (1 + tolerancePct) - epsilon),
  };
}

/**
 * Validate generated AGENTS.md content
 */
export function validateOutput(
  content: string,
  profile: Profile = 'compact'
): ValidationResult {
  const normalized = content.replace(/\r\n/g, '\n');
  const normalizedForCount = normalized.replace(/\n+$/g, '');
  const lines = normalizedForCount.length ? normalizedForCount.split('\n') : [''];
  const lineCount = lines.length;
  const estimatedTokens = estimateTokens(normalizedForCount);
  const limits = PROFILE_LIMITS[profile];
  const toleratedLines = getToleratedBounds(
    limits.targetMinLines,
    limits.targetMaxLines,
    limits.tolerancePct
  );
  const toleratedTokens = getToleratedBounds(
    limits.targetMinTokens,
    limits.targetMaxTokens,
    limits.tolerancePct
  );

  const warnings: string[] = [];
  const errors: string[] = [];

  // Line count validation (profile-specific targets)
  if (lineCount < limits.targetMinLines) {
    warnings.push(
      `Output is quite short (${lineCount} lines). Target for ${profile}: ` +
        `${limits.targetMinLines}-${limits.targetMaxLines} lines.`
    );
  } else if (lineCount > limits.targetMaxLines) {
    warnings.push(
      `Output is too long (${lineCount} lines). Target for ${profile}: ` +
        `${limits.targetMinLines}-${limits.targetMaxLines} lines.`
    );
  }

  if (lineCount < toleratedLines.min || lineCount > toleratedLines.max) {
    warnings.push(
      `[BREACH] Line count outside tolerated range for ${profile} (` +
        `${toleratedLines.min}-${toleratedLines.max} lines).`
    );
  }

  // Token count validation (profile-specific targets)
  if (estimatedTokens < limits.targetMinTokens) {
    warnings.push(
      `Only ${estimatedTokens} tokens (target for ${profile}: ` +
        `${limits.targetMinTokens}-${limits.targetMaxTokens}). Consider adding more details.`
    );
  } else if (estimatedTokens > limits.targetMaxTokens) {
    warnings.push(
      `${estimatedTokens} tokens exceeds budget for ${profile} (max: ${limits.targetMaxTokens}). ` +
        'AI agents may not process it efficiently.'
    );
  }

  if (estimatedTokens < toleratedTokens.min || estimatedTokens > toleratedTokens.max) {
    warnings.push(
      `[BREACH] Token count outside tolerated range for ${profile} (` +
        `${toleratedTokens.min}-${toleratedTokens.max} tokens).`
    );
  }

  // Check for placeholder tokens that shouldn't be in output
  const forbiddenPlaceholders: Array<{ token: string; pattern: RegExp }> = [
    { token: 'undefined', pattern: /\bundefined\b/ },
    { token: 'null', pattern: /\bnull\b/ },
  ];
  for (const { token, pattern } of forbiddenPlaceholders) {
    if (pattern.test(normalized)) {
      errors.push(`Output contains forbidden placeholder string: "${token}"`);
    }
  }

  // Check for N/A commands (should use conditional rendering instead)
  const naCount = (normalized.match(/`N\/A`/g) || []).length;
  if (naCount > 0) {
    warnings.push(
      `Found ${naCount} N/A placeholder(s). Consider hiding missing commands.`
    );
  }

  // Check for empty level-2 sections (ignore level-3 headings as boundaries).
  const headingRegex = /^##\s+.+$/gm;
  const headings = Array.from(normalized.matchAll(headingRegex));
  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    const headingIndex = heading.index;
    if (headingIndex === undefined) {
      continue;
    }

    const headingLine = heading[0];
    const start = headingIndex;
    const end = headings[i + 1]?.index ?? normalized.length;
    const sectionBody = normalized.slice(start + headingLine.length, end);
    const hasMeaningfulLine = sectionBody.split('\n').some(line => {
      const trimmed = line.trim();
      if (trimmed === '') {
        return false;
      }
      if (/^<!--.*-->$/.test(trimmed)) {
        return false;
      }
      return true;
    });

    if (!hasMeaningfulLine) {
      warnings.push(`Section "${headingLine.trim()}" appears to be empty`);
    }
  }

  // Warnings are soft limits and should not block generation.
  const valid = errors.length === 0;

  return {
    valid,
    warnings,
    errors,
    lineCount,
    estimatedTokens,
  };
}
