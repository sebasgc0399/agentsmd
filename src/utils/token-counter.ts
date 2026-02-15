/**
 * Token estimation utilities
 * Uses character count heuristic: ~4 chars/token for text, ~3 chars/token for code
 */

/**
 * Estimate token count for given content
 * This is approximate but sufficient for validation
 */
export function estimateTokens(content: string): number {
  // Extract code blocks (more token-dense)
  const codeBlockRegex = /```[\s\S]*?```/g;
  const codeBlocks = content.match(codeBlockRegex) || [];
  const codeChars = codeBlocks.join('').length;

  // Text without code blocks
  const textContent = content.replace(codeBlockRegex, '');
  const textChars = textContent.length;

  // Estimate: 3 chars/token for code, 4 chars/token for text
  const codeTokens = Math.ceil(codeChars / 3);
  const textTokens = Math.ceil(textChars / 4);

  return codeTokens + textTokens;
}

/**
 * Validate token count against a legacy global budget (800-1500 tokens).
 *
 * @deprecated Use {@link validateOutput} from `@sebasgc0399/agents-md` for
 * profile-aware validation with current limits. This function uses a fixed
 * budget that does not correspond to current profile-specific limits.
 *
 * @example
 * // Preferred: profile-aware validation
 * import { validateOutput } from '@sebasgc0399/agents-md';
 * const result = validateOutput(content, 'compact');
 */
export function validateTokenCount(content: string): {
  tokens: number;
  withinBudget: boolean;
  warning?: string;
} {
  const tokens = estimateTokens(content);
  const MIN_TOKENS = 800;
  const MAX_TOKENS = 1500;

  if (tokens < MIN_TOKENS) {
    return {
      tokens,
      withinBudget: false,
      warning: `Output is quite short (${tokens} tokens). Consider adding more details.`,
    };
  }

  if (tokens > MAX_TOKENS) {
    return {
      tokens,
      withinBudget: false,
      warning: `Output is too long (${tokens} tokens). AI agents may not process it efficiently.`,
    };
  }

  return { tokens, withinBudget: true };
}
