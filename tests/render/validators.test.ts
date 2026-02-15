import { describe, it, expect } from 'vitest';
import { validateOutput } from '../../src/render/validators.js';
import { estimateTokens } from '../../src/utils/token-counter.js';

describe('validateOutput', () => {
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
    const content = `# AGENTS\n\n${'a'.repeat(20000)}`;
    const result = validateOutput(content, 'compact');

    expect(
      result.warnings.some(w => w.includes('exceeds budget for compact'))
    ).toBe(true);
  });

  it('does not warn for compact output around recalibrated minimum token threshold', () => {
    const content = `# AGENTS\n\n${'word '.repeat(180)}`;
    const result = validateOutput(content, 'compact');

    expect(result.estimatedTokens).toBeGreaterThanOrEqual(190);
    expect(result.estimatedTokens).toBeLessThan(250);
    expect(
      result.warnings.some(
        w => w.startsWith('Only ') && w.includes('target for compact')
      )
    ).toBe(false);
    expect(
      result.warnings.some(w =>
        w.includes('[BREACH] Token count outside tolerated range for compact')
      )
    ).toBe(false);
  });

  it('does not warn for full output around recalibrated minimum token threshold', () => {
    const content = `# AGENTS\n\n${'a'.repeat(6640)}`;
    const result = validateOutput(content, 'full');

    expect(result.estimatedTokens).toBeGreaterThanOrEqual(1650);
    expect(result.estimatedTokens).toBeLessThan(1700);
    expect(
      result.warnings.some(w => w.startsWith('Only ') && w.includes('target for full'))
    ).toBe(false);
    expect(
      result.warnings.some(w =>
        w.includes('[BREACH] Token count outside tolerated range for full')
      )
    ).toBe(false);
  });

  it('keeps estimatedTokens stable when content only differs by trailing newlines', () => {
    const base = '# AGENTS\n\nToken baseline text';
    const withoutTrailing = validateOutput(base, 'compact');
    const withTrailing = validateOutput(`${base}\n\n\n`, 'compact');

    expect(withTrailing.estimatedTokens).toBe(withoutTrailing.estimatedTokens);
  });

  it('reports line breach when compact output is outside tolerated range', () => {
    const result = validateOutput('# AGENTS', 'compact');

    expect(
      result.warnings.some(w =>
        w.includes('[BREACH] Line count outside tolerated range for compact')
      )
    ).toBe(true);
  });

  it('reports token breach when compact output is outside tolerated range', () => {
    const content = `# AGENTS\n\n${'a'.repeat(5000)}`;
    const result = validateOutput(content, 'compact');

    expect(
      result.warnings.some(w =>
        w.includes('[BREACH] Token count outside tolerated range for compact')
      )
    ).toBe(true);
  });

  it('keeps compact low-token warning and breach below tolerated minimum', () => {
    const content = `# AGENTS\n\n${'a'.repeat(640)}`;
    const result = validateOutput(content, 'compact');

    expect(
      result.warnings.some(
        w => w.startsWith('Only ') && w.includes('target for compact')
      )
    ).toBe(true);
    expect(
      result.warnings.some(w =>
        w.includes('[BREACH] Token count outside tolerated range for compact')
      )
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

  // --- Boundary tests: standard profile ---

  it('warns when standard exceeds targetMaxLines (190)', () => {
    const content = buildContentWithLines(195);
    expect(content.split('\n').length).toBe(195);
    const result = validateOutput(content, 'standard');

    expect(result.warnings.some(w => w.includes('too long'))).toBe(true);
  });

  it('warns [BREACH] when standard exceeds toleratedMaxLines (209)', () => {
    const content = buildContentWithLines(215);
    const result = validateOutput(content, 'standard');

    expect(
      result.warnings.some(w =>
        w.includes('[BREACH] Line count outside tolerated range for standard')
      )
    ).toBe(true);
  });

  it('warns when standard tokens exceed targetMaxTokens (1700)', () => {
    const content = buildContentAboveTokens(1700);
    expect(estimateTokens(content)).toBeGreaterThan(1700);
    const result = validateOutput(content, 'standard');

    expect(result.warnings.some(w => w.includes('exceeds budget'))).toBe(true);
  });

  // --- Boundary tests: full profile ---

  it('warns when full exceeds targetMaxLines (280)', () => {
    const content = buildContentWithLines(285);
    const result = validateOutput(content, 'full');

    expect(result.warnings.some(w => w.includes('too long'))).toBe(true);
  });

  it('warns [BREACH] when full exceeds toleratedMaxLines (308)', () => {
    const content = buildContentWithLines(315);
    const result = validateOutput(content, 'full');

    expect(
      result.warnings.some(w =>
        w.includes('[BREACH] Line count outside tolerated range for full')
      )
    ).toBe(true);
  });

  it('warns when full tokens below targetMinTokens (1650)', () => {
    const content = buildContentBelowTokens(1650);
    expect(estimateTokens(content)).toBeLessThan(1650);
    const result = validateOutput(content, 'full');

    expect(result.warnings.some(w => w.startsWith('Only '))).toBe(true);
  });
});

// --- Helpers: build content deterministically via estimateTokens ---

function buildContentWithLines(targetLines: number): string {
  return Array.from({ length: targetLines }, (_, i) => `Line ${i + 1} content`).join('\n');
}

function buildContentAboveTokens(targetTokens: number): string {
  const baseUnit = 'word ';
  let content = '';
  while (estimateTokens(content) <= targetTokens) {
    content += baseUnit;
  }
  return content;
}

function buildContentBelowTokens(targetTokens: number): string {
  const baseUnit = 'word ';
  let content = baseUnit.repeat(Math.ceil(targetTokens));
  while (estimateTokens(content) >= targetTokens) {
    content = content.slice(0, -baseUnit.length);
  }
  return content;
}
