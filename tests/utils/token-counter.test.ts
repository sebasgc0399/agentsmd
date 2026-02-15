import { describe, expect, it } from 'vitest';
import { estimateTokens, validateTokenCount } from '../../src/utils/token-counter.js';

describe('token-counter', () => {
  it('estimateTokens() uses ceil(contentLength / 4) for plain text', () => {
    const content = 'abcdefg';

    expect(estimateTokens(content)).toBe(2);
  });

  it('estimateTokens() uses denser counting for code blocks', () => {
    const codeBlock = '```ts\nabc\n```';
    const expected = Math.ceil(codeBlock.length / 3);

    expect(estimateTokens(codeBlock)).toBe(expected);
  });

  it('estimateTokens() handles multiple code blocks plus text', () => {
    const codeBlockA = '```js\nabc\n```';
    const codeBlockB = '```ts\nxy\n```';
    const textParts = ['intro\n', '\nbody\n', '\n'];
    const content = `${textParts[0]}${codeBlockA}${textParts[1]}${codeBlockB}${textParts[2]}`;
    const expected =
      Math.ceil((codeBlockA + codeBlockB).length / 3) +
      Math.ceil(textParts.join('').length / 4);

    expect(estimateTokens(content)).toBe(expected);
  });

  it('validateTokenCount() returns short warning when tokens are below 800', () => {
    const result = validateTokenCount('a'.repeat(100));

    expect(result.tokens).toBeLessThan(800);
    expect(result.withinBudget).toBe(false);
    expect(result.warning).toContain('Output is quite short');
  });

  it('validateTokenCount() returns long warning when tokens are above 1500', () => {
    const result = validateTokenCount('a'.repeat(6001));

    expect(result.tokens).toBeGreaterThan(1500);
    expect(result.withinBudget).toBe(false);
    expect(result.warning).toContain('Output is too long');
  });

  it('validateTokenCount() treats exactly 800 tokens as within budget', () => {
    const result = validateTokenCount('a'.repeat(3200));

    expect(result.tokens).toBe(800);
    expect(result.withinBudget).toBe(true);
    expect(result.warning).toBeUndefined();
  });

  it('validateTokenCount() treats exactly 1500 tokens as within budget', () => {
    const result = validateTokenCount('a'.repeat(6000));

    expect(result.tokens).toBe(1500);
    expect(result.withinBudget).toBe(true);
    expect(result.warning).toBeUndefined();
  });
});
