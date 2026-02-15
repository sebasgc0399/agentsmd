#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { getEncoding } from 'js-tiktoken';

const DEFAULT_ENCODINGS = ['cl100k_base', 'o200k_base'];
const DEFAULT_REPORT_DIR = path.join('artifacts', 'profile-limits');
const PREVIEW_REGEX =
  /--- Preview \(\-\-dry-run mode\) ---\r?\n([\s\S]*?)\r?\n--- End of preview ---/;
const VALID_PROFILES = ['compact', 'standard', 'full'];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const distCliPath = path.join(repoRoot, 'dist', 'cli.js');
const liteScriptPath = path.join(repoRoot, 'scripts', 'benchmark', 'lite.mjs');

function parseCsv(rawValue) {
  return rawValue
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function parseArgs(argv) {
  const parsed = {
    fixtures: null,
    profiles: null,
    encodings: DEFAULT_ENCODINGS,
    reportDir: path.join(repoRoot, DEFAULT_REPORT_DIR),
    jsonOnly: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--fixtures') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('Missing value for --fixtures');
      }
      parsed.fixtures = parseCsv(value);
      i++;
      continue;
    }

    if (arg === '--profiles') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('Missing value for --profiles');
      }
      parsed.profiles = parseCsv(value);
      i++;
      continue;
    }

    if (arg === '--encodings') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('Missing value for --encodings');
      }
      parsed.encodings = parseCsv(value);
      i++;
      continue;
    }

    if (arg === '--report-dir') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('Missing value for --report-dir');
      }
      parsed.reportDir = path.resolve(repoRoot, value);
      i++;
      continue;
    }

    if (arg === '--json-only') {
      parsed.jsonOnly = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (parsed.encodings.length === 0) {
    throw new Error('At least one encoding is required');
  }

  return parsed;
}

function validateEncodings(encodingNames) {
  const encodings = new Map();
  for (const encodingName of encodingNames) {
    try {
      encodings.set(encodingName, getEncoding(encodingName));
    } catch {
      throw new Error(
        `Unknown encoding "${encodingName}". Supported defaults: ${DEFAULT_ENCODINGS.join(', ')}`
      );
    }
  }
  return encodings;
}

function runLiteBenchmark(args) {
  const liteArgs = [liteScriptPath, '--json-only'];
  if (args.fixtures && args.fixtures.length > 0) {
    liteArgs.push('--fixtures', args.fixtures.join(','));
  }
  if (args.profiles && args.profiles.length > 0) {
    liteArgs.push('--profiles', args.profiles.join(','));
  }

  const result = spawnSync(process.execPath, liteArgs, {
    cwd: repoRoot,
    encoding: 'utf-8',
  });

  if (result.status !== 0) {
    throw new Error(
      `benchmark:lite failed: ${result.stderr.trim() || result.stdout.trim() || 'unknown error'}`
    );
  }

  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(
      `Unable to parse benchmark:lite JSON: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

function extractPreview(stdout) {
  const match = stdout.match(PREVIEW_REGEX);
  if (!match) {
    throw new Error('Dry-run preview markers not found in CLI output');
  }
  return match[1];
}

function runCliDryRun(fixture, profile) {
  const fixturePath = path.join(repoRoot, 'tests', 'fixtures', fixture);
  const result = spawnSync(
    process.execPath,
    [distCliPath, 'init', fixturePath, '--dry-run', '--profile', profile],
    {
      cwd: repoRoot,
      encoding: 'utf-8',
    }
  );

  if (result.status !== 0) {
    throw new Error(
      `CLI failed for ${fixture}/${profile}: ${result.stderr.trim() || 'unknown error'}`
    );
  }

  return extractPreview(result.stdout);
}

function normalizePreviewForTokenization(preview) {
  return preview.replace(/\r\n/g, '\n').replace(/\n+$/g, '');
}

function toCaseKey(fixture, profile) {
  return `${fixture}::${profile}`;
}

function pctError(estimated, actual) {
  if (actual === 0) {
    return 0;
  }
  return Math.abs((estimated - actual) / actual) * 100;
}

function mean(values) {
  if (values.length === 0) {
    return 0;
  }
  const total = values.reduce((sum, item) => sum + item, 0);
  return total / values.length;
}

function percentile(values, p) {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  if (lower === upper) {
    return sorted[lower];
  }
  const weight = rank - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function buildProfileSummary(cases, profile) {
  const selected = cases.filter(item => item.profile === profile);
  const lineCounts = selected.map(item => item.lineCount);
  const estimatedTokens = selected.map(item => item.estimatedTokens);
  return {
    cases: selected.length,
    lineCount: {
      min: Math.min(...lineCounts),
      max: Math.max(...lineCounts),
      avg: mean(lineCounts),
    },
    estimatedTokens: {
      min: Math.min(...estimatedTokens),
      max: Math.max(...estimatedTokens),
      avg: mean(estimatedTokens),
    },
  };
}

function buildEncodingSummary(cases, encodingName) {
  const errors = cases.map(item => item.tokenMetrics[encodingName].absPctError);
  const deltas = cases.map(item => item.tokenMetrics[encodingName].delta);
  return {
    cases: cases.length,
    absPctError: {
      mean: mean(errors),
      p50: percentile(errors, 50),
      p95: percentile(errors, 95),
      max: Math.max(...errors),
    },
    deltaTokens: {
      mean: mean(deltas),
      min: Math.min(...deltas),
      max: Math.max(...deltas),
    },
  };
}

function buildFixtureSummary(cases, fixture, encodings) {
  const selected = cases.filter(item => item.fixture === fixture);
  const byEncoding = {};
  for (const encodingName of encodings) {
    byEncoding[encodingName] = buildEncodingSummary(selected, encodingName);
  }
  return {
    cases: selected.length,
    byEncoding,
  };
}

function toFixed(value, decimals = 2) {
  return Number(value.toFixed(decimals));
}

function buildReportMarkdown(report) {
  const lines = [];
  lines.push('# Profile Limits Baseline');
  lines.push('');
  lines.push(`Fixtures: ${report.fixtures.join(', ')}`);
  lines.push(`Profiles: ${report.profiles.join(', ')}`);
  lines.push(`Encodings: ${report.encodings.join(', ')}`);
  lines.push('');

  lines.push('## Error metrics by encoding');
  lines.push('');
  lines.push('| Encoding | Mean abs % error | P50 | P95 | Max | Mean delta tokens |');
  lines.push('|---|---:|---:|---:|---:|---:|');
  for (const encodingName of report.encodings) {
    const summary = report.summary.byEncoding[encodingName];
    lines.push(
      `| ${encodingName} | ${toFixed(summary.absPctError.mean)} | ${toFixed(
        summary.absPctError.p50
      )} | ${toFixed(summary.absPctError.p95)} | ${toFixed(summary.absPctError.max)} | ${toFixed(
        summary.deltaTokens.mean
      )} |`
    );
  }
  lines.push('');

  lines.push('## Profile shape (estimated baseline)');
  lines.push('');
  lines.push('| Profile | Cases | Lines min/max/avg | Estimated tokens min/max/avg |');
  lines.push('|---|---:|---|---|');
  for (const profile of report.profiles) {
    const profileSummary = report.summary.byProfile[profile];
    const lineText =
      `${profileSummary.lineCount.min}/${profileSummary.lineCount.max}/` +
      `${toFixed(profileSummary.lineCount.avg)}`;
    const tokenText =
      `${profileSummary.estimatedTokens.min}/${profileSummary.estimatedTokens.max}/` +
      `${toFixed(profileSummary.estimatedTokens.avg)}`;
    lines.push(`| ${profile} | ${profileSummary.cases} | ${lineText} | ${tokenText} |`);
  }
  lines.push('');

  lines.push('## Cases');
  lines.push('');
  const caseHeaderCells = [
    'Fixture',
    'Profile',
    'Lines',
    'Estimated tokens',
    ...report.encodings.flatMap(encodingName => [
      `${encodingName} real tokens`,
      `${encodingName} abs error %`,
    ]),
  ];
  lines.push(`| ${caseHeaderCells.join(' | ')} |`);
  lines.push(`| ${caseHeaderCells.map(() => '---').join(' | ')} |`);

  for (const item of report.cases) {
    const cells = [item.fixture, item.profile, String(item.lineCount), String(item.estimatedTokens)];
    for (const encodingName of report.encodings) {
      const metrics = item.tokenMetrics[encodingName];
      cells.push(String(metrics.realTokens));
      cells.push(String(toFixed(metrics.absPctError)));
    }
    lines.push(`| ${cells.join(' | ')} |`);
  }
  lines.push('');

  return `${lines.join('\n')}\n`;
}

function writeReport(reportDir, report) {
  fs.mkdirSync(reportDir, { recursive: true });
  const jsonPath = path.join(reportDir, 'baseline.json');
  const mdPath = path.join(reportDir, 'baseline.md');
  const markdown = buildReportMarkdown(report);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');
  fs.writeFileSync(mdPath, markdown, 'utf-8');
  return { jsonPath, mdPath };
}

function assertProfiles(profiles) {
  const invalidProfiles = profiles.filter(profile => !VALID_PROFILES.includes(profile));
  if (invalidProfiles.length > 0) {
    throw new Error(
      `Invalid profile(s): ${invalidProfiles.join(', ')}. Valid profiles: ${VALID_PROFILES.join(', ')}`
    );
  }
}

function main() {
  if (!fs.existsSync(distCliPath)) {
    throw new Error('Missing dist artifacts. Run "npm run build" before "npm run benchmark:limits".');
  }

  const args = parseArgs(process.argv.slice(2));
  const encodings = validateEncodings(args.encodings);
  try {
    if (args.profiles) {
      assertProfiles(args.profiles);
    }

    const liteReport = runLiteBenchmark(args);
    const profileOrder = args.profiles ?? liteReport.profiles;
    assertProfiles(profileOrder);

    const caseLookup = new Map();
    for (const item of liteReport.cases) {
      caseLookup.set(toCaseKey(item.fixture, item.profile), item);
    }

    const orderedCases = [];
    const orderedFixtures = args.fixtures ?? liteReport.fixtures;
    for (const fixture of orderedFixtures) {
      for (const profile of profileOrder) {
        const key = toCaseKey(fixture, profile);
        const liteCase = caseLookup.get(key);
        if (!liteCase) {
          throw new Error(`Case not present in benchmark:lite report: ${key}`);
        }

        const preview = runCliDryRun(fixture, profile);
        const previewNormalized = normalizePreviewForTokenization(preview);
        const tokenMetrics = {};
        for (const [encodingName, encoding] of encodings.entries()) {
          const realTokens = encoding.encode(previewNormalized).length;
          tokenMetrics[encodingName] = {
            realTokens,
            delta: liteCase.validation.estimatedTokens - realTokens,
            absPctError: pctError(liteCase.validation.estimatedTokens, realTokens),
          };
        }

        orderedCases.push({
          fixture,
          profile,
          lineCount: liteCase.validation.lineCount,
          estimatedTokens: liteCase.validation.estimatedTokens,
          tokenMetrics,
        });
      }
    }

    const byProfile = {};
    for (const profile of profileOrder) {
      byProfile[profile] = buildProfileSummary(orderedCases, profile);
    }

    const byEncoding = {};
    for (const encodingName of encodings.keys()) {
      byEncoding[encodingName] = buildEncodingSummary(orderedCases, encodingName);
    }

    const byFixture = {};
    for (const fixture of orderedFixtures) {
      byFixture[fixture] = buildFixtureSummary(orderedCases, fixture, [...encodings.keys()]);
    }

    const report = {
      mode: 'profile-limits',
      fixtures: orderedFixtures,
      profiles: profileOrder,
      encodings: [...encodings.keys()],
      summary: {
        totalCases: orderedCases.length,
        byProfile,
        byEncoding,
        byFixture,
      },
      cases: orderedCases,
    };

    if (args.jsonOnly) {
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    const outputPaths = writeReport(args.reportDir, report);
    console.log('Profile limits baseline generated');
    console.log(`Cases=${report.summary.totalCases}`);
    for (const encodingName of report.encodings) {
      const metrics = report.summary.byEncoding[encodingName];
      console.log(
        `${encodingName}: meanAbsPct=${toFixed(metrics.absPctError.mean)} p95=${toFixed(
          metrics.absPctError.p95
        )} meanDelta=${toFixed(metrics.deltaTokens.mean)}`
      );
    }
    console.log(`JSON: ${outputPaths.jsonPath}`);
    console.log(`MD: ${outputPaths.mdPath}`);
  } finally {
    for (const encoding of encodings.values()) {
      if (typeof encoding.free === 'function') {
        encoding.free();
      }
    }
  }
}

try {
  main();
} catch (error) {
  console.error(
    `benchmark:limits failed: ${error instanceof Error ? error.message : String(error)}`
  );
  process.exitCode = 1;
}
