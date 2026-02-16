import { describe, it, expect } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import { detectProject } from '../../src/detect/index.js';
import { renderAgentsMd } from '../../src/render/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const MAX_LINES = {
  compact: 90,
  standard: 190,
  full: 280,
} as const;

const MIN_LINES = {
  standard: 130,
  full: 200,
} as const;

function getLengthWarnings(warnings: string[]): string[] {
  return warnings.filter(
    warning =>
      warning.startsWith('Output is quite short') || warning.startsWith('Output is too long')
  );
}

function getTokenWarnings(warnings: string[]): string[] {
  return warnings.filter(
    warning =>
      warning.startsWith('Only ') ||
      warning.includes('exceeds budget') ||
      warning.startsWith('[BREACH] Token count')
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

    const compactLines = compactResult.validation.lineCount;
    const standardLines = standardResult.validation.lineCount;
    const fullLines = fullResult.validation.lineCount;

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

    expect(standardResult.validation.lineCount).toBeGreaterThanOrEqual(MIN_LINES.standard);
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

  it('keeps representative calibrated profiles free of token warning regressions', async () => {
    const runtimePath = path.join(repoRoot, 'tests', 'fixtures', 'runtime-npm');
    const vuePath = path.join(repoRoot, 'tests', 'fixtures', 'vue-vite');

    const runtimeDetection = await detectProject(runtimePath);
    const vueDetection = await detectProject(vuePath);

    const runtimeCompact = renderAgentsMd(runtimeDetection, 'compact');
    const vueFull = renderAgentsMd(vueDetection, 'full');

    expect(getTokenWarnings(runtimeCompact.validation.warnings)).toEqual([]);
    expect(getTokenWarnings(vueFull.validation.warnings)).toEqual([]);
  });

  it('does not leak unknown generic block into vue projects', async () => {
    const fixturePath = path.join(repoRoot, 'tests', 'fixtures', 'vue-vite');
    const detection = await detectProject(fixturePath);

    expect(detection.framework.type).toBe('vue');
    expect(detection.folderStructure.isMonorepo).toBe(false);

    const standardResult = renderAgentsMd(detection, 'standard');

    expect(standardResult.content).not.toContain('## Generic project execution playbook');
  });

  it('vue template includes Vue delivery checklist in standard', async () => {
    const fixturePath = path.join(repoRoot, 'tests', 'fixtures', 'vue-vite');
    const detection = await detectProject(fixturePath);
    const standardResult = renderAgentsMd(detection, 'standard');

    expect(standardResult.content).toContain('Vue delivery checklist');
    expect(standardResult.content).not.toContain('React delivery checklist');
  });

  it('angular fixture stays within profile limits', async () => {
    const fixturePath = path.join(repoRoot, 'tests', 'fixtures', 'angular-simple');
    const detection = await detectProject(fixturePath);

    const compactResult = renderAgentsMd(detection, 'compact');
    const standardResult = renderAgentsMd(detection, 'standard');
    const fullResult = renderAgentsMd(detection, 'full');

    expect(compactResult.validation.lineCount).toBeLessThanOrEqual(MAX_LINES.compact);
    expect(standardResult.validation.lineCount).toBeLessThanOrEqual(MAX_LINES.standard);
    expect(standardResult.validation.lineCount).toBeGreaterThanOrEqual(MIN_LINES.standard);
    expect(fullResult.validation.lineCount).toBeLessThanOrEqual(MAX_LINES.full);
    expect(fullResult.validation.lineCount).toBeGreaterThanOrEqual(MIN_LINES.full);

    expect(getLengthWarnings(compactResult.validation.warnings)).toEqual([]);
    expect(getLengthWarnings(standardResult.validation.warnings)).toEqual([]);
    expect(getLengthWarnings(fullResult.validation.warnings)).toEqual([]);
  });
});
