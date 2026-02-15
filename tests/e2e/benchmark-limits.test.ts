import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const scriptPath = path.join(repoRoot, 'scripts', 'benchmark', 'profile-limits.mjs');
const distCliPath = path.join(repoRoot, 'dist', 'cli.js');

if (!fs.existsSync(distCliPath)) {
  throw new Error('dist/cli.js missing. Run "npm run build" before "npm test".');
}

function runBenchmarkLimits(args: string[]) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf-8',
  });
}

describe('benchmark limits harness', () => {
  it('runs benchmark limits on a subset and emits consistent JSON shape', () => {
    const result = runBenchmarkLimits([
      '--fixtures',
      'react-vite',
      '--profiles',
      'compact',
      '--json-only',
    ]);

    expect(result.status).toBe(0);
    const report = JSON.parse(result.stdout);

    expect(report.mode).toBe('profile-limits');
    expect(report.summary.totalCases).toBe(1);
    expect(report.encodings).toEqual(['cl100k_base', 'o200k_base']);
    expect(report.summary.byProfile.compact.cases).toBe(1);
    expect(report.summary.byFixture['react-vite'].cases).toBe(1);

    const firstCase = report.cases[0];
    expect(firstCase.fixture).toBe('react-vite');
    expect(firstCase.profile).toBe('compact');
    expect(firstCase.tokenMetrics.cl100k_base.realTokens).toBeGreaterThan(0);
    expect(firstCase.tokenMetrics.o200k_base.realTokens).toBeGreaterThan(0);
    expect(typeof firstCase.tokenMetrics.cl100k_base.absPctError).toBe('number');
  });

  it('is deterministic for same fixtures/profiles/encodings in json-only mode', () => {
    const args = ['--fixtures', 'react-vite', '--profiles', 'compact', '--json-only'];
    const run1 = runBenchmarkLimits(args);
    const run2 = runBenchmarkLimits(args);

    expect(run1.status).toBe(0);
    expect(run2.status).toBe(0);
    expect(run1.stdout).toBe(run2.stdout);
  });

  it('fails for unknown encoding', () => {
    const result = runBenchmarkLimits([
      '--fixtures',
      'react-vite',
      '--profiles',
      'compact',
      '--encodings',
      'cl100k_base,invalid_encoding',
      '--json-only',
    ]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Unknown encoding');
  });
});
