import { describe, it, expect } from 'vitest';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const scriptPath = path.join(repoRoot, 'scripts', 'benchmark', 'lite.mjs');

function parseReportFromStdout(stdout: string): {
  summary: { totalCases: number; passedCases: number; failedCases: number; gatePassed: boolean };
  cases: Array<{
    commands: { extracted: string[] };
    score: { total: number; criteria: { clarityStructure: number } };
    semantic: { requiredSectionsMissing: string[] };
  }>;
} {
  const marker = '--- Benchmark Lite JSON ---';
  const markerIndex = stdout.lastIndexOf(marker);
  if (markerIndex === -1) {
    throw new Error('JSON marker not found in benchmark output');
  }

  const jsonPayload = stdout.slice(markerIndex + marker.length).trim();
  return JSON.parse(jsonPayload);
}

describe('benchmark lite harness', () => {
  it('runs benchmark on subset and exits 0', () => {
    const result = spawnSync(
      process.execPath,
      [scriptPath, '--fixtures', 'react-vite', '--profiles', 'compact'],
      {
        cwd: repoRoot,
        encoding: 'utf-8',
      }
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Benchmark Lite Summary');
    expect(result.stdout).toContain('--- Benchmark Lite JSON ---');

    const report = parseReportFromStdout(result.stdout);
    expect(report.summary.totalCases).toBe(1);
    expect(report.summary.failedCases).toBe(0);
    expect(report.summary.gatePassed).toBe(true);
    expect(report.cases[0].score.criteria.clarityStructure).toBe(2);
    expect(report.cases[0].score.total).toBe(11);
    expect(report.cases[0].semantic.requiredSectionsMissing).toEqual([]);
  });

  it('fails on invalid fixture input', () => {
    const result = spawnSync(
      process.execPath,
      [scriptPath, '--fixtures', 'fixture-that-does-not-exist', '--profiles', 'compact'],
      {
        cwd: repoRoot,
        encoding: 'utf-8',
      }
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Unknown fixture');
  });

  it('extract canonical commands ignores workspace example commands', () => {
    const result = spawnSync(
      process.execPath,
      [scriptPath, '--fixtures', 'monorepo-turbo', '--profiles', 'compact', '--json-only'],
      {
        cwd: repoRoot,
        encoding: 'utf-8',
      }
    );

    expect(result.status).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report.summary.totalCases).toBe(1);

    const extractedCommands: string[] = report.cases[0].commands.extracted;
    expect(extractedCommands.length).toBeGreaterThan(0);
    expect(extractedCommands.some(command => command.includes('--workspace'))).toBe(false);
    expect(extractedCommands.some(command => command.includes('--filter'))).toBe(false);
    expect(extractedCommands.some(command => command.includes('workspace @'))).toBe(false);
  });
});
