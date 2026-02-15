#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ISSUE_LABELS = [
  'benchmark:unknown',
  'benchmark:invalid-command',
  'benchmark:regression',
];

const DEFAULT_WINDOW_DAYS = 28;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const liteScriptPath = path.join(repoRoot, 'scripts', 'benchmark', 'lite.mjs');
const p1ScriptPath = path.join(repoRoot, 'scripts', 'benchmark', 'p1.mjs');
const defaultBaselinePath = path.join(
  repoRoot,
  'tests',
  'benchmark',
  'baselines',
  'p1.semantic.json'
);
const defaultReportDir = path.join(repoRoot, 'artifacts', 'benchmark-p2');

function parseCsv(rawValue) {
  return rawValue
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function parsePositiveInt(rawValue, flagName) {
  const value = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Invalid value for ${flagName}: ${rawValue}. Expected positive integer.`);
  }
  return value;
}

function parseRepo(value) {
  const trimmed = value.trim();
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(trimmed)) {
    throw new Error(
      `Invalid repo format: ${value}. Expected "owner/name" (for example: sebasgc0399/agents-md).`
    );
  }
  return trimmed;
}

function parseNow(rawValue) {
  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid value for --now: ${rawValue}. Expected ISO date.`);
  }
  return parsed;
}

function parseArgs(argv) {
  const parsed = {
    fixtures: null,
    profiles: null,
    baselinePath: defaultBaselinePath,
    reportDir: defaultReportDir,
    repo: null,
    windowDays: DEFAULT_WINDOW_DAYS,
    jsonOnly: false,
    noIssues: false,
    now: null,
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

    if (arg === '--baseline') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('Missing value for --baseline');
      }
      parsed.baselinePath = path.resolve(repoRoot, value);
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

    if (arg === '--repo') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('Missing value for --repo');
      }
      parsed.repo = parseRepo(value);
      i++;
      continue;
    }

    if (arg === '--window-days') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('Missing value for --window-days');
      }
      parsed.windowDays = parsePositiveInt(value, '--window-days');
      i++;
      continue;
    }

    if (arg === '--now') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('Missing value for --now');
      }
      parsed.now = parseNow(value);
      i++;
      continue;
    }

    if (arg === '--json-only') {
      parsed.jsonOnly = true;
      continue;
    }

    if (arg === '--no-issues') {
      parsed.noIssues = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return parsed;
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

function runP1Check(args) {
  const p1Args = [p1ScriptPath];
  if (args.fixtures && args.fixtures.length > 0) {
    p1Args.push('--fixtures', args.fixtures.join(','));
  }
  if (args.profiles && args.profiles.length > 0) {
    p1Args.push('--profiles', args.profiles.join(','));
  }

  if (args.baselinePath !== defaultBaselinePath) {
    p1Args.push('--baseline', args.baselinePath);
  }

  const result = spawnSync(process.execPath, p1Args, {
    cwd: repoRoot,
    encoding: 'utf-8',
  });

  return {
    status: result.status === 0 ? 'pass' : 'fail',
    exitCode: result.status ?? 1,
    stdout: (result.stdout || '').trim(),
    stderr: (result.stderr || '').trim(),
  };
}

function buildCaseKey(fixture, profile) {
  return `${fixture}::${profile}`;
}

function loadBaseline(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Baseline file not found: ${filePath}`);
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Invalid baseline JSON at ${filePath}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

function mean(values) {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function buildBenchmarkMetrics(liteReport, baseline) {
  const baselineMap = new Map();
  for (const baselineCase of baseline.cases || []) {
    baselineMap.set(buildCaseKey(baselineCase.fixture, baselineCase.profile), baselineCase);
  }

  const cases = liteReport.cases || [];
  const totalCases = cases.length;
  const passedCases = cases.filter(item => item.status === 'pass').length;
  const deterministicCases = cases.filter(item => item.deterministic).length;
  const scores = cases.map(item => item.score.total);

  let totalInvalidCommands = 0;
  let totalExtractedCommands = 0;
  let unknownTokenCases = 0;
  let lineTokenWarningCases = 0;
  const scoreDiffsVsBaseline = [];

  for (const item of cases) {
    totalInvalidCommands += item.commands.invalid.length;
    totalExtractedCommands += item.commands.extracted.length;
    if ((item.validation.unknownTokenCount || 0) > 0) {
      unknownTokenCases++;
    }
    if ((item.validation.lineTokenWarnings || []).length > 0) {
      lineTokenWarningCases++;
    }

    const caseKey = buildCaseKey(item.fixture, item.profile);
    const baselineCase = baselineMap.get(caseKey);
    if (!baselineCase) {
      throw new Error(`Case not found in baseline: ${caseKey}`);
    }
    scoreDiffsVsBaseline.push(item.score.total - baselineCase.scoreTotal);
  }

  const baselineScoresForSelection = cases.map(item => {
    const baselineCase = baselineMap.get(buildCaseKey(item.fixture, item.profile));
    return baselineCase.scoreTotal;
  });

  return {
    totalCases,
    passedCases,
    failedCases: totalCases - passedCases,
    passRate: totalCases === 0 ? 0 : passedCases / totalCases,
    determinismRate: totalCases === 0 ? 0 : deterministicCases / totalCases,
    avgScore: mean(scores),
    minScore: scores.length === 0 ? 0 : Math.min(...scores),
    baselineAvgScore: mean(baselineScoresForSelection),
    scoreVsBaselineAvg: mean(scoreDiffsVsBaseline),
    invalidCommandRate:
      totalExtractedCommands === 0 ? 0 : totalInvalidCommands / totalExtractedCommands,
    invalidCommandCount: totalInvalidCommands,
    extractedCommandCount: totalExtractedCommands,
    unknownTokenCaseRate: totalCases === 0 ? 0 : unknownTokenCases / totalCases,
    unknownTokenCaseCount: unknownTokenCases,
    lineTokenWarningRate: totalCases === 0 ? 0 : lineTokenWarningCases / totalCases,
    lineTokenWarningCaseCount: lineTokenWarningCases,
  };
}

function toIsoNoMs(date) {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function shiftDays(date, days) {
  const shifted = new Date(date);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted;
}

async function fetchGitHubIssueCount({ repo, token, query }) {
  const url = `https://api.github.com/search/issues?q=${encodeURIComponent(query)}&per_page=1`;
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'agents-md-benchmark-p2',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(
      `GitHub API error (${response.status}) for query "${query}": ${bodyText || 'no body'}`
    );
  }

  const data = await response.json();
  if (typeof data.total_count !== 'number') {
    throw new Error(`Unexpected GitHub API response for query "${query}"`);
  }
  return data.total_count;
}

function buildIssueQueries({ repo, label, now }) {
  const last7Start = shiftDays(now, -7);
  const prev7Start = shiftDays(now, -14);

  const nowIso = toIsoNoMs(now);
  const last7StartIso = toIsoNoMs(last7Start);
  const prev7StartIso = toIsoNoMs(prev7Start);

  return {
    openNow: `repo:${repo} is:issue label:"${label}" state:open`,
    createdLast7d: `repo:${repo} is:issue label:"${label}" created:>=${last7StartIso} created:<${nowIso}`,
    closedLast7d: `repo:${repo} is:issue label:"${label}" closed:>=${last7StartIso} closed:<${nowIso}`,
    createdPrev7d: `repo:${repo} is:issue label:"${label}" created:>=${prev7StartIso} created:<${last7StartIso}`,
    closedPrev7d: `repo:${repo} is:issue label:"${label}" closed:>=${prev7StartIso} closed:<${last7StartIso}`,
  };
}

function computeTrend(createdLast7d, createdPrev7d) {
  const delta = createdLast7d - createdPrev7d;
  if (delta > 0) {
    return 'up';
  }
  if (delta < 0) {
    return 'down';
  }
  return 'flat';
}

async function fetchIssuesMetrics({ repo, token, now }) {
  const labels = {};

  for (const label of ISSUE_LABELS) {
    const queries = buildIssueQueries({ repo, label, now });
    const openNow = await fetchGitHubIssueCount({
      repo,
      token,
      query: queries.openNow,
    });
    const createdLast7d = await fetchGitHubIssueCount({
      repo,
      token,
      query: queries.createdLast7d,
    });
    const closedLast7d = await fetchGitHubIssueCount({
      repo,
      token,
      query: queries.closedLast7d,
    });
    const createdPrev7d = await fetchGitHubIssueCount({
      repo,
      token,
      query: queries.createdPrev7d,
    });
    const closedPrev7d = await fetchGitHubIssueCount({
      repo,
      token,
      query: queries.closedPrev7d,
    });

    labels[label] = {
      openNow,
      createdLast7d,
      closedLast7d,
      createdPrev7d,
      closedPrev7d,
      trend7d: computeTrend(createdLast7d, createdPrev7d),
    };
  }

  return labels;
}

function pct(value) {
  return `${(value * 100).toFixed(2)}%`;
}

function buildAlerts({ metrics, p1Status }) {
  const alerts = [];

  if (metrics.determinismRate < 1.0) {
    alerts.push({
      id: 'determinism_rate',
      severity: 'warning',
      message: `Determinism rate below 100% (${pct(metrics.determinismRate)}).`,
    });
  }

  if (metrics.invalidCommandRate > 0) {
    alerts.push({
      id: 'invalid_command_rate',
      severity: 'warning',
      message: `Invalid command rate is above 0 (${pct(metrics.invalidCommandRate)}).`,
    });
  }

  if (metrics.scoreVsBaselineAvg < 0) {
    alerts.push({
      id: 'score_vs_baseline',
      severity: 'warning',
      message: `Average score is below baseline (${metrics.scoreVsBaselineAvg.toFixed(2)} points).`,
    });
  }

  if (p1Status.status === 'fail') {
    alerts.push({
      id: 'p1_status',
      severity: 'warning',
      message: 'benchmark:p1 check is failing in this run.',
    });
  }

  return alerts;
}

function buildMarkdownReport(report) {
  const lines = [];
  lines.push('# Benchmark P2 Trends Report');
  lines.push('');
  lines.push(`Generated at: ${report.generatedAt}`);
  lines.push(`Repository: ${report.context.repository || 'n/a'}`);
  lines.push(`Fixtures: ${report.context.fixtures.join(', ')}`);
  lines.push(`Profiles: ${report.context.profiles.join(', ')}`);
  lines.push(`Window days: ${report.context.windowDays}`);
  lines.push('');

  lines.push('## Benchmark metrics');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|---|---:|');
  lines.push(`| totalCases | ${report.benchmark.metrics.totalCases} |`);
  lines.push(`| passRate | ${pct(report.benchmark.metrics.passRate)} |`);
  lines.push(`| determinismRate | ${pct(report.benchmark.metrics.determinismRate)} |`);
  lines.push(`| avgScore | ${report.benchmark.metrics.avgScore.toFixed(2)} |`);
  lines.push(`| minScore | ${report.benchmark.metrics.minScore} |`);
  lines.push(
    `| scoreVsBaselineAvg | ${report.benchmark.metrics.scoreVsBaselineAvg.toFixed(2)} |`
  );
  lines.push(
    `| invalidCommandRate | ${pct(report.benchmark.metrics.invalidCommandRate)} |`
  );
  lines.push(
    `| unknownTokenCaseRate | ${pct(report.benchmark.metrics.unknownTokenCaseRate)} |`
  );
  lines.push(
    `| lineTokenWarningRate | ${pct(report.benchmark.metrics.lineTokenWarningRate)} |`
  );
  lines.push(`| p1Status | ${report.benchmark.p1.status} |`);
  lines.push('');

  lines.push('## Issues by label');
  lines.push('');
  if (report.issues.status !== 'ok') {
    lines.push(`Issues metrics status: ${report.issues.status} (${report.issues.reason || 'n/a'})`);
  } else {
    lines.push('| Label | openNow | createdLast7d | closedLast7d | createdPrev7d | closedPrev7d | trend7d |');
    lines.push('|---|---:|---:|---:|---:|---:|---|');
    for (const label of ISSUE_LABELS) {
      const row = report.issues.labels[label];
      lines.push(
        `| ${label} | ${row.openNow} | ${row.createdLast7d} | ${row.closedLast7d} | ${row.createdPrev7d} | ${row.closedPrev7d} | ${row.trend7d} |`
      );
    }
  }
  lines.push('');

  lines.push('## Alerts');
  lines.push('');
  if (report.alerts.length === 0) {
    lines.push('- none');
  } else {
    for (const alert of report.alerts) {
      lines.push(`- [${alert.severity}] ${alert.id}: ${alert.message}`);
    }
  }
  lines.push('');

  return `${lines.join('\n')}\n`;
}

function writeReportFiles(reportDir, reportJson, reportMarkdown) {
  fs.mkdirSync(reportDir, { recursive: true });
  const reportJsonPath = path.join(reportDir, 'report.json');
  const reportMarkdownPath = path.join(reportDir, 'report.md');

  fs.writeFileSync(reportJsonPath, `${JSON.stringify(reportJson, null, 2)}\n`, 'utf-8');
  fs.writeFileSync(reportMarkdownPath, reportMarkdown, 'utf-8');

  return {
    reportJsonPath,
    reportMarkdownPath,
  };
}

async function buildIssuesSection(args, now) {
  if (args.noIssues) {
    return {
      status: 'disabled',
      reason: 'disabled_by_flag',
      labels: {},
    };
  }

  const repoFromEnv = process.env.GITHUB_REPOSITORY;
  const repo = args.repo ?? (repoFromEnv ? parseRepo(repoFromEnv) : null);
  const token = process.env.GITHUB_TOKEN;

  if (!repo) {
    return {
      status: 'skipped',
      reason: 'missing_repo',
      labels: {},
    };
  }

  if (!token) {
    return {
      status: 'skipped',
      reason: 'missing_token',
      labels: {},
      repository: repo,
    };
  }

  const labels = await fetchIssuesMetrics({
    repo,
    token,
    now,
  });

  return {
    status: 'ok',
    reason: null,
    repository: repo,
    labels,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const now = args.now ?? new Date();

  const liteReport = runLiteBenchmark(args);
  const baseline = loadBaseline(args.baselinePath);
  const p1Status = runP1Check(args);
  const benchmarkMetrics = buildBenchmarkMetrics(liteReport, baseline);
  const issues = await buildIssuesSection(args, now);
  const alerts = buildAlerts({
    metrics: benchmarkMetrics,
    p1Status,
  });

  const report = {
    mode: 'p2',
    generatedAt: now.toISOString(),
    context: {
      repository: issues.repository || args.repo || process.env.GITHUB_REPOSITORY || null,
      fixtures: [...liteReport.fixtures],
      profiles: [...liteReport.profiles],
      windowDays: args.windowDays,
      baselinePath: path.relative(repoRoot, args.baselinePath).split(path.sep).join('/'),
    },
    benchmark: {
      p1: {
        status: p1Status.status,
        exitCode: p1Status.exitCode,
      },
      metrics: benchmarkMetrics,
      liteSummary: liteReport.summary,
    },
    issues,
    alerts,
  };

  if (args.jsonOnly) {
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = 0;
    return;
  }

  const markdown = buildMarkdownReport(report);
  const outputFiles = writeReportFiles(args.reportDir, report, markdown);

  console.log('Benchmark P2 Summary');
  console.log(
    `Cases=${benchmarkMetrics.totalCases} passRate=${pct(benchmarkMetrics.passRate)} determinism=${pct(benchmarkMetrics.determinismRate)}`
  );
  console.log(
    `avgScore=${benchmarkMetrics.avgScore.toFixed(2)} scoreVsBaselineAvg=${benchmarkMetrics.scoreVsBaselineAvg.toFixed(2)} invalidCommandRate=${pct(benchmarkMetrics.invalidCommandRate)}`
  );
  console.log(
    `issuesStatus=${issues.status}${issues.reason ? ` (${issues.reason})` : ''} p1Status=${p1Status.status}`
  );
  console.log(`Alerts=${alerts.length}`);
  console.log(`Report JSON: ${outputFiles.reportJsonPath}`);
  console.log(`Report MD: ${outputFiles.reportMarkdownPath}`);

  process.exitCode = 0;
}

main().catch(error => {
  console.error(`benchmark:p2 failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
