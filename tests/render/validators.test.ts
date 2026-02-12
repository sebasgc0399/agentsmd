import { describe, it, expect } from 'vitest';
import { validateOutput } from '../../src/render/validators.js';

describe('validateOutput', () => {
  it('fails when output contains "undefined"', () => {
    const result = validateOutput('# AGENTS\n\nvalue: undefined');

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'Output contains forbidden placeholder string: "undefined"'
    );
  });

  it('fails when output contains "null"', () => {
    const result = validateOutput('# AGENTS\n\nvalue: null');

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'Output contains forbidden placeholder string: "null"'
    );
  });

  it('does not add placeholder errors when output is clean', () => {
    const result = validateOutput('# AGENTS\n\nEverything is rendered correctly.');

    expect(result.errors).toEqual([]);
  });

  it('does not fail on words that only contain placeholder substrings', () => {
    const result = validateOutput('# AGENTS\n\nWords: nullify and undefinedBehavior.');

    expect(result.errors).toEqual([]);
  });
});
