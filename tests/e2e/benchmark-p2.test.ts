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

function runP2(args: string[]) {
  return spawnSync(process.execPath, [p2ScriptPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf-8',
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

  it('fails on invalid repo format when explicitly provided', () => {
    const result = runP2([
      '--repo',
      'invalid-repo-format',
    ]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Invalid repo format');
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
