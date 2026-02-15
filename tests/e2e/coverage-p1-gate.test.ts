import { describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const scriptPath = path.join(repoRoot, 'scripts', 'coverage-p1-gate.mjs');

type CoverageP1Folder = {
  folder: string;
  expectedMinBranches: number;
  actualBranches: number | null;
  branchesCovered: number;
  branchesTotal: number;
  measuredFiles: number;
  fileCount: number;
  pass: boolean;
};

type CoverageP1Report = {
  status: 'ok' | 'warn' | 'error';
  folders: CoverageP1Folder[];
  deviations: unknown[];
};

function runCoverageGate(args: string[]) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf-8',
  });
}

function createCoverageStats(pct: number) {
  const total = 10;
  const covered = Math.round((pct / 100) * total);

  return {
    lines: { total, covered, skipped: 0, pct },
    statements: { total, covered, skipped: 0, pct },
    functions: { total: 1, covered: 1, skipped: 0, pct: 100 },
    branches: { total, covered, skipped: 0, pct },
  };
}

function createCoverageSummary(options?: {
  detectPct?: number;
  renderPct?: number;
  utilsPct?: number;
  mixedPaths?: boolean;
}) {
  const detectPct = options?.detectPct ?? 90;
  const renderPct = options?.renderPct ?? 90;
  const utilsPct = options?.utilsPct ?? 90;
  const mixedPaths = options?.mixedPaths ?? false;

  const detectFrameworkPath = mixedPaths
    ? 'C:\\repo\\src\\detect\\framework-detector.ts'
    : '/repo/src/detect/framework-detector.ts';
  const detectFolderPath = mixedPaths
    ? '/repo/src/detect/index.ts'
    : '/repo/src/detect/index.ts';
  const renderDataBuilderPath = mixedPaths
    ? 'D:\\repo\\src\\render\\data-builder.ts'
    : '/repo/src/render/data-builder.ts';
  const renderValidatorsPath = mixedPaths
    ? '/repo/src/render/validators.ts'
    : '/repo/src/render/validators.ts';
  const utilsFsPath = mixedPaths
    ? '/repo/src/utils/fs-utils.ts'
    : '/repo/src/utils/fs-utils.ts';
  const utilsLoggerPath = mixedPaths
    ? 'E:\\repo\\src\\utils\\logger.ts'
    : '/repo/src/utils/logger.ts';

  return {
    total: createCoverageStats(90),
    [detectFrameworkPath]: createCoverageStats(detectPct),
    [detectFolderPath]: createCoverageStats(detectPct),
    [renderDataBuilderPath]: createCoverageStats(renderPct),
    [renderValidatorsPath]: createCoverageStats(renderPct),
    [utilsFsPath]: createCoverageStats(utilsPct),
    [utilsLoggerPath]: createCoverageStats(utilsPct),
  };
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf-8');
}

describe('coverage p1 gate', () => {
  it('passes in strict mode when folder thresholds are met', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-md-p1-gate-pass-'));
    const summaryPath = path.join(tempDir, 'coverage-summary.json');
    const reportJson = path.join(tempDir, 'gate.json');
    const reportMd = path.join(tempDir, 'gate.md');

    writeJson(summaryPath, createCoverageSummary({ detectPct: 90, renderPct: 90, utilsPct: 90 }));

    const result = runCoverageGate([
      '--coverage-summary',
      summaryPath,
      '--json-file',
      reportJson,
      '--markdown-file',
      reportMd,
    ]);

    expect(result.status).toBe(0);
    const parsed = JSON.parse(fs.readFileSync(reportJson, 'utf-8')) as CoverageP1Report;
    expect(parsed.status).toBe('ok');
    expect(parsed.deviations).toHaveLength(0);

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('fails in strict mode when detect is below threshold', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-md-p1-gate-fail-'));
    const summaryPath = path.join(tempDir, 'coverage-summary.json');
    const reportJson = path.join(tempDir, 'gate.json');
    const reportMd = path.join(tempDir, 'gate.md');

    writeJson(summaryPath, createCoverageSummary({ detectPct: 75, renderPct: 90, utilsPct: 90 }));

    const result = runCoverageGate([
      '--coverage-summary',
      summaryPath,
      '--json-file',
      reportJson,
      '--markdown-file',
      reportMd,
    ]);

    expect(result.status).not.toBe(0);
    const parsed = JSON.parse(fs.readFileSync(reportJson, 'utf-8')) as CoverageP1Report;
    expect(parsed.status).toBe('warn');
    expect(parsed.deviations.length).toBeGreaterThan(0);

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('does not fail in non-strict mode when thresholds are not met', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-md-p1-gate-nonstrict-'));
    const summaryPath = path.join(tempDir, 'coverage-summary.json');
    const reportJson = path.join(tempDir, 'gate.json');
    const reportMd = path.join(tempDir, 'gate.md');

    writeJson(summaryPath, createCoverageSummary({ detectPct: 75, renderPct: 90, utilsPct: 90 }));

    const result = runCoverageGate([
      '--coverage-summary',
      summaryPath,
      '--json-file',
      reportJson,
      '--markdown-file',
      reportMd,
      '--no-strict',
    ]);

    expect(result.status).toBe(0);
    const parsed = JSON.parse(fs.readFileSync(reportJson, 'utf-8')) as CoverageP1Report;
    expect(parsed.status).toBe('warn');

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('is deterministic with fixed --now', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-md-p1-gate-deterministic-'));
    const summaryPath = path.join(tempDir, 'coverage-summary.json');
    const reportJson = path.join(tempDir, 'gate.json');
    const reportMd = path.join(tempDir, 'gate.md');

    writeJson(summaryPath, createCoverageSummary({ detectPct: 90, renderPct: 90, utilsPct: 90 }));

    const args = [
      '--coverage-summary',
      summaryPath,
      '--json-file',
      reportJson,
      '--markdown-file',
      reportMd,
      '--now',
      '2026-02-15T00:00:00.000Z',
    ];

    const run1 = runCoverageGate(args);
    expect(run1.status).toBe(0);
    const report1 = fs.readFileSync(reportJson, 'utf-8');

    const run2 = runCoverageGate(args);
    expect(run2.status).toBe(0);
    const report2 = fs.readFileSync(reportJson, 'utf-8');

    expect(report2).toBe(report1);

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('normalizes Windows and POSIX paths when grouping folder coverage', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-md-p1-gate-paths-'));
    const summaryPath = path.join(tempDir, 'coverage-summary.json');
    const reportJson = path.join(tempDir, 'gate.json');
    const reportMd = path.join(tempDir, 'gate.md');

    writeJson(summaryPath, createCoverageSummary({ detectPct: 90, renderPct: 90, utilsPct: 90, mixedPaths: true }));

    const result = runCoverageGate([
      '--coverage-summary',
      summaryPath,
      '--json-file',
      reportJson,
      '--markdown-file',
      reportMd,
    ]);

    expect(result.status).toBe(0);
    const parsed = JSON.parse(fs.readFileSync(reportJson, 'utf-8')) as CoverageP1Report;
    const folderMap = new Map<string, CoverageP1Folder>(
      parsed.folders.map((folder) => [folder.folder, folder] as const)
    );

    expect(folderMap.get('src/detect')?.actualBranches).toBe(90);
    expect(folderMap.get('src/render')?.actualBranches).toBe(90);
    expect(folderMap.get('src/utils')?.actualBranches).toBe(90);
    expect(folderMap.get('src/detect')?.pass).toBe(true);
    expect(folderMap.get('src/render')?.pass).toBe(true);
    expect(folderMap.get('src/utils')?.pass).toBe(true);

    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
