import { describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const p2ScriptPath = path.join(repoRoot, 'scripts', 'benchmark', 'p2.mjs');

function runP2(args: string[], envOverrides: NodeJS.ProcessEnv = {}) {
  return spawnSync(process.execPath, [p2ScriptPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf-8',
    env: {
      ...process.env,
      ...envOverrides,
    },
  });
}

describe('benchmark p2 harness', () => {
  it('runs p2 on subset without issues and exits 0', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-md-p2-'));
    const result = runP2([
      '--fixtures',
      'react-vite',
      '--profiles',
      'compact',
      '--no-issues',
      '--report-dir',
      tempDir,
    ]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Benchmark P2 Summary');

    const reportJsonPath = path.join(tempDir, 'report.json');
    const reportMarkdownPath = path.join(tempDir, 'report.md');
    expect(fs.existsSync(reportJsonPath)).toBe(true);
    expect(fs.existsSync(reportMarkdownPath)).toBe(true);

    const parsed = JSON.parse(fs.readFileSync(reportJsonPath, 'utf-8'));
    expect(parsed.mode).toBe('p2');
    expect(parsed.benchmark.metrics.totalCases).toBe(1);

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('json-only outputs valid report payload', () => {
    const result = runP2([
      '--fixtures',
      'react-vite',
      '--profiles',
      'compact',
      '--no-issues',
      '--json-only',
      '--now',
      '2026-02-14T00:00:00.000Z',
    ]);

    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.benchmark).toBeDefined();
    expect(parsed.issues).toBeDefined();
    expect(parsed.alerts).toBeDefined();
  });

  it('reports issues disabled status when running with --no-issues', () => {
    const result = runP2([
      '--fixtures',
      'react-vite',
      '--profiles',
      'compact',
      '--no-issues',
      '--json-only',
      '--now',
      '2026-02-15T00:00:00.000Z',
    ]);

    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.issues.status).toBe('disabled');
    expect(parsed.issues.reason).toBe('disabled_by_flag');
  });

  it('reports issues skipped/missing_token when --repo is set without GITHUB_TOKEN', () => {
    const result = runP2(
      [
        '--fixtures',
        'react-vite',
        '--profiles',
        'compact',
        '--repo',
        'sebasgc0399/agents-md',
        '--json-only',
        '--now',
        '2026-02-15T00:00:00.000Z',
      ],
      { GITHUB_TOKEN: '' }
    );

    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.issues.status).toBe('skipped');
    expect(parsed.issues.reason).toBe('missing_token');
  });

  it('fails on invalid repo format when explicitly provided', () => {
    const result = runP2([
      '--repo',
      'invalid-repo-format',
    ]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Invalid repo format');
  });

  it('emits p1_status alert when p1 check fails', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-md-p2-p1-fail-'));
    const baselinePath = path.join(tempDir, 'baseline.json');
    const baseline = {
      version: 1,
      fixtures: ['react-vite'],
      profiles: ['compact'],
      cases: [
        {
          fixture: 'react-vite',
          profile: 'compact',
          scoreTotal: 11,
          scoreThreshold: 7,
          precision: 1,
          precisionThreshold: 0.9,
          semantic: {
            h2HeadingsNormalized: ['intentionally-mismatched'],
            requiredSectionsPresent: [],
            requiredSectionsMissing: [],
            canonicalCommands: [],
            canonicalCommandCount: 0,
            hasBlockingPlaceholders: false,
            hasToolSpecificInstructions: false,
            emptySectionCount: 0,
          },
        },
      ],
    };
    fs.writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`, 'utf-8');

    const result = runP2([
      '--fixtures',
      'react-vite',
      '--profiles',
      'compact',
      '--baseline',
      baselinePath,
      '--no-issues',
      '--json-only',
      '--now',
      '2026-02-15T00:00:00.000Z',
    ]);

    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.benchmark.p1.status).toBe('fail');
    expect(parsed.alerts.some((alert: { id: string }) => alert.id === 'p1_status')).toBe(true);

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('report is deterministic with fixed --now and --no-issues', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-md-p2-deterministic-'));

    const args = [
      '--fixtures',
      'react-vite',
      '--profiles',
      'compact',
      '--no-issues',
      '--report-dir',
      tempDir,
      '--now',
      '2026-02-14T00:00:00.000Z',
    ];

    const run1 = runP2(args);
    expect(run1.status).toBe(0);
    const firstContent = fs.readFileSync(path.join(tempDir, 'report.json'), 'utf-8');

    const run2 = runP2(args);
    expect(run2.status).toBe(0);
    const secondContent = fs.readFileSync(path.join(tempDir, 'report.json'), 'utf-8');

    expect(secondContent).toBe(firstContent);

    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
