import { describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const scriptPath = path.join(repoRoot, 'scripts', 'coverage', 'p0-report.mjs');
const defaultCoverageSummaryPath = path.join(repoRoot, 'coverage', 'coverage-summary.json');

type CoverageP0Target = {
  target: string;
  expectedMinBranches: number;
  actualBranches: number | null;
  pass: boolean;
};

type CoverageP0Report = {
  status: 'ok' | 'warn' | 'error';
  targets: CoverageP0Target[];
  deviations: unknown[];
};

function runCoverageReport(args: string[]) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf-8',
  });
}

function createCoverageStats(pct: number) {
  return {
    lines: { total: 10, covered: 10, skipped: 0, pct },
    statements: { total: 10, covered: 10, skipped: 0, pct },
    functions: { total: 1, covered: 1, skipped: 0, pct },
    branches: { total: 10, covered: Math.round((pct / 100) * 10), skipped: 0, pct },
  };
}

function createCoverageSummary(options?: {
  frameworkBranches?: number;
  dataBuilderBranches?: number;
  validatorsBranches?: number;
  loggerBranches?: number;
  mixedPaths?: boolean;
}) {
  const frameworkBranches = options?.frameworkBranches ?? 93;
  const dataBuilderBranches = options?.dataBuilderBranches ?? 100;
  const validatorsBranches = options?.validatorsBranches ?? 87;
  const loggerBranches = options?.loggerBranches ?? 100;
  const mixedPaths = options?.mixedPaths ?? false;

  const frameworkPath = mixedPaths
    ? 'C:\\repo\\src\\detect\\framework-detector.ts'
    : '/repo/src/detect/framework-detector.ts';
  const dataBuilderPath = mixedPaths
    ? '/repo/src/render/data-builder.ts'
    : '/repo/src/render/data-builder.ts';
  const validatorsPath = mixedPaths
    ? 'D:\\repo\\src\\render\\validators.ts'
    : '/repo/src/render/validators.ts';
  const loggerPath = mixedPaths
    ? '/repo/src/utils/logger.ts'
    : '/repo/src/utils/logger.ts';

  return {
    total: createCoverageStats(85),
    [frameworkPath]: createCoverageStats(frameworkBranches),
    '/repo/src/detect/index.ts': createCoverageStats(90),
    [dataBuilderPath]: createCoverageStats(dataBuilderBranches),
    '/repo/src/render/index.ts': createCoverageStats(100),
    [validatorsPath]: createCoverageStats(validatorsBranches),
    [loggerPath]: createCoverageStats(loggerBranches),
    '/repo/src/utils/fs-utils.ts': createCoverageStats(74),
    '/repo/src/utils/version.ts': createCoverageStats(80),
  };
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf-8');
}

describe('coverage p0 report', () => {
  it('generates default report with real/default coverage source path', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-md-p0-report-default-'));
    const reportJson = path.join(tempDir, 'report.json');
    const reportMd = path.join(tempDir, 'report.md');

    const hadOriginalCoverage = fs.existsSync(defaultCoverageSummaryPath);
    const originalCoverageContent = hadOriginalCoverage
      ? fs.readFileSync(defaultCoverageSummaryPath, 'utf-8')
      : null;

    try {
      if (!hadOriginalCoverage) {
        writeJson(defaultCoverageSummaryPath, createCoverageSummary());
      }

      const result = runCoverageReport([
        '--json-file',
        reportJson,
        '--markdown-file',
        reportMd,
      ]);

      expect(result.status).toBe(0);
      expect(fs.existsSync(reportJson)).toBe(true);
      expect(fs.existsSync(reportMd)).toBe(true);

      const parsed = JSON.parse(fs.readFileSync(reportJson, 'utf-8')) as CoverageP0Report;
      expect(parsed.targets).toHaveLength(4);
      expect(parsed.targets.map((item) => item.target)).toEqual([
        'src/detect/framework-detector.ts',
        'src/render/data-builder.ts',
        'src/render/validators.ts',
        'src/utils/logger.ts',
      ]);
    } finally {
      if (hadOriginalCoverage && originalCoverageContent !== null) {
        fs.writeFileSync(defaultCoverageSummaryPath, originalCoverageContent, 'utf-8');
      } else if (fs.existsSync(defaultCoverageSummaryPath)) {
        fs.rmSync(defaultCoverageSummaryPath, { force: true });
      }

      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('reports deviations as warn in default mode without blocking', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-md-p0-report-warn-'));
    const summaryPath = path.join(tempDir, 'coverage-summary.json');
    const reportJson = path.join(tempDir, 'report.json');
    const reportMd = path.join(tempDir, 'report.md');

    writeJson(summaryPath, createCoverageSummary({ frameworkBranches: 60 }));

    const result = runCoverageReport([
      '--coverage-summary',
      summaryPath,
      '--json-file',
      reportJson,
      '--markdown-file',
      reportMd,
    ]);

    expect(result.status).toBe(0);
    const parsed = JSON.parse(fs.readFileSync(reportJson, 'utf-8')) as CoverageP0Report;
    expect(parsed.status).toBe('warn');
    expect(parsed.deviations.length).toBeGreaterThan(0);

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('fails in strict mode when deviations exist', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-md-p0-report-strict-'));
    const summaryPath = path.join(tempDir, 'coverage-summary.json');
    const reportJson = path.join(tempDir, 'report.json');
    const reportMd = path.join(tempDir, 'report.md');

    writeJson(summaryPath, createCoverageSummary({ frameworkBranches: 60 }));

    const result = runCoverageReport([
      '--coverage-summary',
      summaryPath,
      '--json-file',
      reportJson,
      '--markdown-file',
      reportMd,
      '--strict',
    ]);

    expect(result.status).not.toBe(0);
    const parsed = JSON.parse(fs.readFileSync(reportJson, 'utf-8')) as CoverageP0Report;
    expect(parsed.status).toBe('warn');

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('is deterministic with fixed --now for identical input', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-md-p0-report-deterministic-'));
    const summaryPath = path.join(tempDir, 'coverage-summary.json');
    const reportJson = path.join(tempDir, 'report.json');
    const reportMd = path.join(tempDir, 'report.md');

    writeJson(summaryPath, createCoverageSummary());

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

    const run1 = runCoverageReport(args);
    expect(run1.status).toBe(0);
    const report1 = fs.readFileSync(reportJson, 'utf-8');

    const run2 = runCoverageReport(args);
    expect(run2.status).toBe(0);
    const report2 = fs.readFileSync(reportJson, 'utf-8');

    expect(report2).toBe(report1);

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('normalizes Windows and POSIX paths when matching target files', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-md-p0-report-paths-'));
    const summaryPath = path.join(tempDir, 'coverage-summary.json');
    const reportJson = path.join(tempDir, 'report.json');
    const reportMd = path.join(tempDir, 'report.md');

    writeJson(summaryPath, createCoverageSummary({ mixedPaths: true }));

    const result = runCoverageReport([
      '--coverage-summary',
      summaryPath,
      '--json-file',
      reportJson,
      '--markdown-file',
      reportMd,
    ]);

    expect(result.status).toBe(0);
    const parsed = JSON.parse(fs.readFileSync(reportJson, 'utf-8')) as CoverageP0Report;

    const targetMap = new Map<string, CoverageP0Target>(
      parsed.targets.map((item) => [item.target, item] as const)
    );

    expect(targetMap.get('src/detect/framework-detector.ts')?.actualBranches).toBe(93);
    expect(targetMap.get('src/render/data-builder.ts')?.actualBranches).toBe(100);
    expect(targetMap.get('src/render/validators.ts')?.actualBranches).toBe(87);
    expect(targetMap.get('src/utils/logger.ts')?.actualBranches).toBe(100);
    expect(targetMap.get('src/detect/framework-detector.ts')?.pass).toBe(true);
    expect(targetMap.get('src/render/data-builder.ts')?.pass).toBe(true);
    expect(targetMap.get('src/render/validators.ts')?.pass).toBe(true);
    expect(targetMap.get('src/utils/logger.ts')?.pass).toBe(true);

    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
