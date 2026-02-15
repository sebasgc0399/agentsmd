#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TARGETS = [
  {
    path: 'src/detect/framework-detector.ts',
    suffix: '/src/detect/framework-detector.ts',
    minBranches: 75,
  },
  {
    path: 'src/render/data-builder.ts',
    suffix: '/src/render/data-builder.ts',
    minBranches: 80,
  },
  {
    path: 'src/render/validators.ts',
    suffix: '/src/render/validators.ts',
    minBranches: 80,
  },
  {
    path: 'src/utils/logger.ts',
    suffix: '/src/utils/logger.ts',
    minBranches: 1,
  },
];

const FOLDERS = [
  { name: 'detect', prefix: '/src/detect/' },
  { name: 'render', prefix: '/src/render/' },
  { name: 'utils', prefix: '/src/utils/' },
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const defaults = {
  coverageSummary: path.join(repoRoot, 'coverage', 'coverage-summary.json'),
  jsonFile: path.join(repoRoot, 'artifacts', 'coverage-p0', 'report.json'),
  markdownFile: path.join(repoRoot, 'artifacts', 'coverage-p0', 'report.md'),
  strict: false,
  now: null,
};

function parseArgs(argv) {
  const args = { ...defaults };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--coverage-summary') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('Missing value for --coverage-summary');
      }
      args.coverageSummary = path.resolve(repoRoot, value);
      i++;
      continue;
    }

    if (arg === '--json-file') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('Missing value for --json-file');
      }
      args.jsonFile = path.resolve(repoRoot, value);
      i++;
      continue;
    }

    if (arg === '--markdown-file') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('Missing value for --markdown-file');
      }
      args.markdownFile = path.resolve(repoRoot, value);
      i++;
      continue;
    }

    if (arg === '--now') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('Missing value for --now');
      }
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        throw new Error(`Invalid value for --now: ${value}`);
      }
      args.now = date;
      i++;
      continue;
    }

    if (arg === '--strict') {
      args.strict = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function normalizePathForMatch(value) {
  return String(value).replace(/\\/g, '/').toLowerCase();
}

function toDisplayPath(value) {
  return String(value).replace(/\\/g, '/');
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function getBranchPct(metrics) {
  const value = metrics?.branches?.pct;
  return isFiniteNumber(value) ? value : null;
}

function ensureDirForFile(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function readCoverageSummary(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Coverage summary file not found: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(raw);

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Coverage summary content is not a valid JSON object');
  }

  return parsed;
}

function toCoverageEntries(summary) {
  return Object.entries(summary)
    .filter(([key]) => key !== 'total')
    .map(([rawPath, metrics]) => ({
      rawPath,
      displayPath: toDisplayPath(rawPath),
      matchPath: normalizePathForMatch(rawPath),
      branches: getBranchPct(metrics),
    }));
}

function computeFolderStats(entries, folder) {
  const folderEntries = entries.filter(entry => entry.matchPath.includes(folder.prefix));
  const branchValues = folderEntries
    .map(entry => entry.branches)
    .filter(value => value !== null);

  if (branchValues.length === 0) {
    return {
      folder: `src/${folder.name}`,
      fileCount: folderEntries.length,
      branchAvg: null,
      branchMin: null,
      branchMax: null,
    };
  }

  const sum = branchValues.reduce((acc, value) => acc + value, 0);

  return {
    folder: `src/${folder.name}`,
    fileCount: folderEntries.length,
    branchAvg: round2(sum / branchValues.length),
    branchMin: round2(Math.min(...branchValues)),
    branchMax: round2(Math.max(...branchValues)),
  };
}

function computeTargets(entries) {
  const targets = [];
  const deviations = [];

  for (const target of TARGETS) {
    const entry = entries.find(item => item.matchPath.endsWith(target.suffix));
    const actualBranches = entry ? entry.branches : null;
    const pass = actualBranches !== null && actualBranches >= target.minBranches;

    targets.push({
      target: target.path,
      expectedMinBranches: target.minBranches,
      actualBranches,
      pass,
    });

    if (!pass) {
      const message =
        actualBranches === null
          ? `Missing coverage entry for ${target.path}`
          : `${target.path} below target (${actualBranches.toFixed(2)}% < ${target.minBranches}%)`;

      deviations.push({
        type: 'target',
        target: target.path,
        expectedMinBranches: target.minBranches,
        actualBranches,
        message,
      });
    }
  }

  return {
    targets,
    deviations,
  };
}

function formatPct(value) {
  return value === null ? 'N/A' : `${value.toFixed(2)}%`;
}

function buildMarkdown(report) {
  const lines = [];
  lines.push('## Coverage P0 Report (non-blocking)');
  lines.push('');
  lines.push(`- Status: **${report.status.toUpperCase()}**`);
  lines.push(`- Strict mode: \`${report.strict}\``);
  lines.push(`- Source: \`${report.source.coverageSummary}\``);
  lines.push(`- Generated at: \`${report.generatedAt}\``);
  lines.push('');

  lines.push('### Folder summary');
  lines.push('');
  lines.push('| Folder | Files | Avg branches | Min branches | Max branches |');
  lines.push('|---|---:|---:|---:|---:|');
  for (const folder of report.folders) {
    lines.push(
      `| \`${folder.folder}/*\` | ${folder.fileCount} | ${formatPct(folder.branchAvg)} | ${formatPct(folder.branchMin)} | ${formatPct(folder.branchMax)} |`
    );
  }
  lines.push('');

  lines.push('### P0 targets (internal, non-gating)');
  lines.push('');
  lines.push('| Target | Expected | Actual | Result |');
  lines.push('|---|---:|---:|---|');
  for (const target of report.targets) {
    lines.push(
      `| \`${target.target}\` | >= ${target.expectedMinBranches}% | ${formatPct(target.actualBranches)} | ${target.pass ? 'PASS' : 'WARN'} |`
    );
  }
  lines.push('');

  lines.push('### Deviations');
  lines.push('');
  if (report.deviations.length === 0 && report.errors.length === 0) {
    lines.push('- none');
  } else {
    for (const deviation of report.deviations) {
      lines.push(`- ${deviation.message}`);
    }
    for (const error of report.errors) {
      lines.push(`- error: ${error}`);
    }
  }
  lines.push('');

  return `${lines.join('\n')}\n`;
}

function writeReports(report, args) {
  const markdown = buildMarkdown(report);
  ensureDirForFile(args.jsonFile);
  ensureDirForFile(args.markdownFile);
  fs.writeFileSync(args.jsonFile, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');
  fs.writeFileSync(args.markdownFile, markdown, 'utf-8');
}

function buildReport(args, summary, errors) {
  const entries = summary ? toCoverageEntries(summary) : [];
  const folders = FOLDERS.map(folder => computeFolderStats(entries, folder));
  const { targets, deviations } = computeTargets(entries);

  let status = 'ok';
  if (errors.length > 0) {
    status = 'error';
  } else if (deviations.length > 0) {
    status = 'warn';
  }

  return {
    mode: 'coverage-p0',
    generatedAt: (args.now ?? new Date()).toISOString(),
    source: {
      coverageSummary: args.coverageSummary,
    },
    strict: args.strict,
    status,
    folders,
    targets,
    deviations,
    errors,
  };
}

function printSummary(report, args) {
  console.log('Coverage P0 report (non-blocking)');
  console.log(
    `status=${report.status} strict=${report.strict} deviations=${report.deviations.length} errors=${report.errors.length}`
  );
  for (const folder of report.folders) {
    console.log(
      `folder=${folder.folder} files=${folder.fileCount} avg=${formatPct(folder.branchAvg)} min=${formatPct(folder.branchMin)}`
    );
  }
  console.log(`reportJson=${args.jsonFile}`);
  console.log(`reportMd=${args.markdownFile}`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const errors = [];
  let summary = null;

  try {
    summary = readCoverageSummary(args.coverageSummary);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  const report = buildReport(args, summary, errors);
  writeReports(report, args);
  printSummary(report, args);

  if (args.strict && report.status !== 'ok') {
    process.exitCode = 1;
    return;
  }

  process.exitCode = 0;
}

try {
  main();
} catch (error) {
  console.error(`coverage:p0:report failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
