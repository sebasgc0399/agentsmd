#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FOLDER_THRESHOLDS = [
  { name: 'detect', prefix: '/src/detect/', minBranches: 85 },
  { name: 'render', prefix: '/src/render/', minBranches: 85 },
  { name: 'utils', prefix: '/src/utils/', minBranches: 80 },
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const defaults = {
  coverageSummary: path.join(repoRoot, 'coverage', 'coverage-summary.json'),
  jsonFile: path.join(repoRoot, 'artifacts', 'coverage-p1', 'gate.json'),
  markdownFile: path.join(repoRoot, 'artifacts', 'coverage-p1', 'gate.md'),
  strict: true,
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

    if (arg === '--no-strict') {
      args.strict = false;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function normalizePathForMatch(value) {
  return String(value).replace(/\\/g, '/').toLowerCase();
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
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
    .map(([rawPath, metrics]) => {
      const branchesTotal = isFiniteNumber(metrics?.branches?.total) ? metrics.branches.total : null;
      const branchesCovered = isFiniteNumber(metrics?.branches?.covered) ? metrics.branches.covered : null;
      return {
        matchPath: normalizePathForMatch(rawPath),
        branchesTotal,
        branchesCovered,
      };
    });
}

function computeFolderResult(entries, folder) {
  const folderEntries = entries.filter(entry => entry.matchPath.includes(folder.prefix));
  const measurableEntries = folderEntries.filter(
    entry => entry.branchesTotal !== null && entry.branchesCovered !== null && entry.branchesTotal > 0
  );

  const branchesCovered = measurableEntries.reduce((acc, entry) => acc + entry.branchesCovered, 0);
  const branchesTotal = measurableEntries.reduce((acc, entry) => acc + entry.branchesTotal, 0);
  const actualBranches = branchesTotal > 0 ? round2((branchesCovered / branchesTotal) * 100) : null;
  const pass = actualBranches !== null && actualBranches >= folder.minBranches;

  return {
    folder: `src/${folder.name}`,
    expectedMinBranches: folder.minBranches,
    actualBranches,
    branchesCovered,
    branchesTotal,
    measuredFiles: measurableEntries.length,
    fileCount: folderEntries.length,
    pass,
  };
}

function formatPct(value) {
  return value === null ? 'N/A' : `${value.toFixed(2)}%`;
}

function buildReport(args, summary, errors) {
  const entries = summary ? toCoverageEntries(summary) : [];
  const folders = FOLDER_THRESHOLDS.map(folder => computeFolderResult(entries, folder));

  const deviations = folders
    .filter(folder => !folder.pass)
    .map(folder => ({
      type: 'folder',
      folder: folder.folder,
      expectedMinBranches: folder.expectedMinBranches,
      actualBranches: folder.actualBranches,
      message:
        folder.actualBranches === null
          ? `No measurable branch coverage entries for ${folder.folder}/*`
          : `${folder.folder} below target (${folder.actualBranches.toFixed(2)}% < ${folder.expectedMinBranches}%)`,
    }));

  let status = 'ok';
  if (errors.length > 0) {
    status = 'error';
  } else if (deviations.length > 0) {
    status = 'warn';
  }

  return {
    mode: 'coverage-p1-gate',
    generatedAt: (args.now ?? new Date()).toISOString(),
    source: {
      coverageSummary: path.relative(repoRoot, args.coverageSummary).split(path.sep).join('/'),
    },
    strict: args.strict,
    status,
    thresholds: FOLDER_THRESHOLDS.map(folder => ({
      folder: `src/${folder.name}`,
      minBranches: folder.minBranches,
    })),
    folders,
    deviations,
    errors,
  };
}

function buildMarkdown(report) {
  const lines = [];

  lines.push('## Coverage P1 Gate (blocking by folder)');
  lines.push('');
  lines.push(`- Status: **${report.status.toUpperCase()}**`);
  lines.push(`- Strict mode: \`${report.strict}\``);
  lines.push(`- Source: \`${report.source.coverageSummary}\``);
  lines.push(`- Generated at: \`${report.generatedAt}\``);
  lines.push('');
  lines.push('### Folder thresholds');
  lines.push('');
  lines.push('| Folder | Expected branches | Actual branches | Covered/Total branches | Measured files | Result |');
  lines.push('|---|---:|---:|---:|---:|---|');
  for (const folder of report.folders) {
    lines.push(
      `| \`${folder.folder}/*\` | >= ${folder.expectedMinBranches}% | ${formatPct(folder.actualBranches)} | ${folder.branchesCovered}/${folder.branchesTotal} | ${folder.measuredFiles}/${folder.fileCount} | ${folder.pass ? 'PASS' : 'FAIL'} |`
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
  ensureDirForFile(args.jsonFile);
  ensureDirForFile(args.markdownFile);
  fs.writeFileSync(args.jsonFile, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');
  fs.writeFileSync(args.markdownFile, buildMarkdown(report), 'utf-8');
}

function printSummary(report, args) {
  console.log('Coverage P1 gate (blocking by folder)');
  console.log(
    `status=${report.status} strict=${report.strict} deviations=${report.deviations.length} errors=${report.errors.length}`
  );
  for (const folder of report.folders) {
    console.log(
      `folder=${folder.folder} expected>=${folder.expectedMinBranches}% actual=${formatPct(folder.actualBranches)} measured=${folder.measuredFiles}/${folder.fileCount}`
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
  console.error(`coverage:p1:gate failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
