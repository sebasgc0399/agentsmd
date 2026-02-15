import { describe, it, expect } from 'vitest';
import { validateOutput } from '../../src/render/validators.js';

describe('validateOutput', () => {
  // NOTE: The branch `limits.minTokens > 0 && estimatedTokens < minTokens`
  // is currently inactive because all profiles set minTokens=0 by design.
  it('counts lines without trailing newline off-by-one', () => {
    const result = validateOutput('a\nb\n');

    expect(result.lineCount).toBe(2);
  });

  it('counts single line with trailing newline as one line', () => {
    const result = validateOutput('a\n');

    expect(result.lineCount).toBe(1);
  });

  it('counts line with multiple trailing newlines consistently', () => {
    const result = validateOutput('a\n\n\n');

    expect(result.lineCount).toBe(1);
  });

  it('keeps valid=true when only soft-limit warnings exist', () => {
    const result = validateOutput('# AGENTS');

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

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

  it('does not warn about empty section when section contains level-3 heading/content', () => {
    const result = validateOutput([
      '# AGENTS',
      '## Main section',
      '### Subsection',
      'details here',
      '## Next section',
      'text',
    ].join('\n'));

    expect(result.warnings.some(w => w.includes('appears to be empty'))).toBe(false);
  });

  it('warns when a level-2 section is immediately followed by another level-2 section', () => {
    const result = validateOutput([
      '# AGENTS',
      '## First section',
      '## Second section',
      'text',
    ].join('\n'));

    expect(result.warnings).toContain('Section "## First section" appears to be empty');
  });

  it('warns when a section body only contains html comments and blank lines', () => {
    const result = validateOutput([
      '# AGENTS',
      '## X',
      '<!-- comment -->',
      '<!-- another -->',
      '',
      '## Y',
      'text',
    ].join('\n'));

    expect(result.warnings).toContain('Section "## X" appears to be empty');
  });

  it('does not warn when section body has real text after html comment lines', () => {
    const result = validateOutput([
      '# AGENTS',
      '## X',
      '<!-- comment -->',
      'Text here',
      '## Y',
      'text',
    ].join('\n'));

    expect(
      result.warnings.some(w => w === 'Section "## X" appears to be empty')
    ).toBe(false);
  });

  it('warns when compact output exceeds max line limit', () => {
    const content = Array.from({ length: 111 }, (_, i) => `line ${i}`).join('\n');
    const result = validateOutput(content, 'compact');

    expect(result.warnings.some(w => w.includes('Output is too long'))).toBe(true);
  });

  it('warns when token count exceeds profile budget', () => {
    const content = `# AGENTS\n\n${'a'.repeat(4000)}`;
    const result = validateOutput(content, 'compact');

    expect(
      result.warnings.some(w => w.includes('exceeds budget for compact'))
    ).toBe(true);
  });

  it('warns and counts multiple N/A placeholders', () => {
    const content = '# AGENTS\n\n`N/A`\n`N/A`\n`N/A`';
    const result = validateOutput(content, 'compact');

    expect(result.warnings).toContain(
      'Found 3 N/A placeholder(s). Consider hiding missing commands.'
    );
  });

  it('warns when final level-2 section is empty', () => {
    const result = validateOutput('# AGENTS\n## Final section');

    expect(result.warnings).toContain('Section "## Final section" appears to be empty');
  });

  it('handles empty content input consistently', () => {
    const result = validateOutput('');

    expect(result.lineCount).toBe(1);
    expect(result.valid).toBe(true);
  });
});
