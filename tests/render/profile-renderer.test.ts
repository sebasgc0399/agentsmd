import { describe, it, expect } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import { detectProject } from '../../src/detect/index.js';
import { renderAgentsMd } from '../../src/render/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const MAX_LINES = {
  compact: 110,
  standard: 230,
  full: 360,
} as const;

const MIN_LINES = {
  standard: 150,
  full: 220,
} as const;

function countLines(content: string): number {
  return content.split('\n').length;
}

function getLengthWarnings(warnings: string[]): string[] {
  return warnings.filter(
    warning =>
      warning.startsWith('Output is quite short') || warning.startsWith('Output is too long')
  );
}

describe('renderAgentsMd profiles', () => {
  it('renders compact, standard and full with expected growth and limits', async () => {
    const fixturePath = path.join(repoRoot, 'tests', 'fixtures', 'react-vite');
    const detection = await detectProject(fixturePath);

    const compactResult = renderAgentsMd(detection, 'compact');
    const standardResult = renderAgentsMd(detection, 'standard');
    const fullResult = renderAgentsMd(detection, 'full');
    const defaultResult = renderAgentsMd(detection);

    expect(compactResult.content).toContain('# AGENTS');
    expect(standardResult.content).toContain('# AGENTS');
    expect(fullResult.content).toContain('# AGENTS');

    const compactLines = countLines(compactResult.content);
    const standardLines = countLines(standardResult.content);
    const fullLines = countLines(fullResult.content);

    expect(compactLines).toBeLessThanOrEqual(MAX_LINES.compact);
    expect(standardLines).toBeLessThanOrEqual(MAX_LINES.standard);
    expect(fullLines).toBeLessThanOrEqual(MAX_LINES.full);
    expect(standardLines).toBeGreaterThanOrEqual(MIN_LINES.standard);
    expect(fullLines).toBeGreaterThanOrEqual(MIN_LINES.full);

    expect(standardLines).toBeGreaterThan(compactLines);
    expect(fullLines).toBeGreaterThan(standardLines);

    // Backward compatibility: default profile should behave as compact.
    expect(defaultResult.content).toBe(compactResult.content);
  });

  it('keeps unknown generic standard/full within length limits without length warnings', async () => {
    const fixturePath = path.join(repoRoot, 'tests', 'fixtures', 'runtime-npm');
    const detection = await detectProject(fixturePath);

    expect(detection.framework.type).toBe('unknown');
    expect(detection.folderStructure.isMonorepo).toBe(false);

    const standardResult = renderAgentsMd(detection, 'standard');
    const fullResult = renderAgentsMd(detection, 'full');

    expect(standardResult.validation.lineCount).toBeGreaterThanOrEqual(160);
    expect(standardResult.validation.lineCount).toBeLessThanOrEqual(MAX_LINES.standard);
    expect(fullResult.validation.lineCount).toBeGreaterThanOrEqual(MIN_LINES.full);
    expect(fullResult.validation.lineCount).toBeLessThanOrEqual(MAX_LINES.full);

    expect(getLengthWarnings(standardResult.validation.warnings)).toEqual([]);
    expect(getLengthWarnings(fullResult.validation.warnings)).toEqual([]);
  });

  it('keeps known stack profiles free of length warning regressions', async () => {
    const reactPath = path.join(repoRoot, 'tests', 'fixtures', 'react-vite');
    const monorepoPath = path.join(repoRoot, 'tests', 'fixtures', 'monorepo-turbo');

    const reactDetection = await detectProject(reactPath);
    const monorepoDetection = await detectProject(monorepoPath);

    const reactStandard = renderAgentsMd(reactDetection, 'standard');
    const reactFull = renderAgentsMd(reactDetection, 'full');
    const monorepoStandard = renderAgentsMd(monorepoDetection, 'standard');
    const monorepoFull = renderAgentsMd(monorepoDetection, 'full');

    expect(getLengthWarnings(reactStandard.validation.warnings)).toEqual([]);
    expect(getLengthWarnings(reactFull.validation.warnings)).toEqual([]);
    expect(getLengthWarnings(monorepoStandard.validation.warnings)).toEqual([]);
    expect(getLengthWarnings(monorepoFull.validation.warnings)).toEqual([]);

    expect(reactStandard.content).toContain('React delivery checklist');
    expect(monorepoStandard.content).toContain('Monorepo delivery checklist');
  });

  it('does not leak unknown generic block into vue projects using base template', async () => {
    const fixturePath = path.join(repoRoot, 'tests', 'fixtures', 'vue-vite');
    const detection = await detectProject(fixturePath);

    expect(detection.framework.type).toBe('vue');
    expect(detection.folderStructure.isMonorepo).toBe(false);

    const standardResult = renderAgentsMd(detection, 'standard');

    expect(standardResult.content).not.toContain('## Generic project execution playbook');
  });
});
