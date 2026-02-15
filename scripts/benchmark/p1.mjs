#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  SCORE_THRESHOLDS,
  COMMAND_PRECISION_THRESHOLDS,
} from './shared-constants.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const liteScriptPath = path.join(repoRoot, 'scripts', 'benchmark', 'lite.mjs');
const defaultBaselinePath = path.join(
  repoRoot,
  'tests',
  'benchmark',
  'baselines',
  'p1.semantic.json'
);

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
    baselinePath: defaultBaselinePath,
    updateBaseline: false,
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

    if (arg === '--update-baseline') {
      parsed.updateBaseline = true;
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
      `lite benchmark failed: ${result.stderr.trim() || result.stdout.trim() || 'unknown error'}`
    );
  }

  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(
      `Unable to parse lite benchmark JSON: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

function buildCaseKey(fixture, profile) {
  return `${fixture}::${profile}`;
}

function toCanonicalBaseline(liteReport) {
  const canonicalCases = liteReport.cases
    .map(item => {
      const scoreThreshold = SCORE_THRESHOLDS[item.profile];
      const precisionThreshold = COMMAND_PRECISION_THRESHOLDS[item.profile];
      return {
        fixture: item.fixture,
        profile: item.profile,
        scoreTotal: item.score.total,
        scoreThreshold,
        precision: item.commands.precision,
        precisionThreshold,
        semantic: item.semantic,
      };
    })
    .sort((a, b) => {
      const keyA = buildCaseKey(a.fixture, a.profile);
      const keyB = buildCaseKey(b.fixture, b.profile);
      return keyA.localeCompare(keyB);
    });

  return {
    version: 1,
    fixtures: [...new Set(canonicalCases.map(item => item.fixture))].sort(),
    profiles: [...new Set(canonicalCases.map(item => item.profile))].sort(),
    cases: canonicalCases,
  };
}

function ensureDirectoryForFile(filePath) {
  const dirPath = path.dirname(filePath);
  fs.mkdirSync(dirPath, { recursive: true });
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

function mapCases(cases) {
  const map = new Map();
  for (const item of cases) {
    map.set(buildCaseKey(item.fixture, item.profile), item);
  }
  return map;
}

function compareSemantic(actualSemantic, baselineSemantic) {
  const actualString = JSON.stringify(actualSemantic);
  const baselineString = JSON.stringify(baselineSemantic);
  return actualString === baselineString;
}

function runCheckMode(args, liteReport) {
  const baseline = loadBaseline(args.baselinePath);
  const actualCanonical = toCanonicalBaseline(liteReport);

  const baselineMap = mapCases(baseline.cases || []);
  const actualMap = mapCases(actualCanonical.cases);

  const allKeys = [...new Set([...baselineMap.keys(), ...actualMap.keys()])].sort();
  const failures = [];

  for (const key of allKeys) {
    const baselineCase = baselineMap.get(key);
    const actualCase = actualMap.get(key);

    if (!baselineCase && actualCase) {
      failures.push(`[${key}] missing in baseline`);
      continue;
    }

    if (baselineCase && !actualCase) {
      failures.push(`[${key}] missing in actual run`);
      continue;
    }

    const scoreThreshold = SCORE_THRESHOLDS[actualCase.profile];
    const precisionThreshold = COMMAND_PRECISION_THRESHOLDS[actualCase.profile];

    if (!compareSemantic(actualCase.semantic, baselineCase.semantic)) {
      failures.push(`[${key}] semantic snapshot drift detected`);
    }

    if (actualCase.scoreTotal < scoreThreshold) {
      failures.push(
        `[${key}] score below threshold (${actualCase.scoreTotal} < ${scoreThreshold})`
      );
    }

    if (actualCase.scoreTotal < baselineCase.scoreTotal - 1) {
      failures.push(
        `[${key}] regression budget exceeded (${actualCase.scoreTotal} < ${
          baselineCase.scoreTotal - 1
        })`
      );
    }

    if (actualCase.precision < precisionThreshold) {
      failures.push(
        `[${key}] precision below threshold (${(actualCase.precision * 100).toFixed(
          2
        )}% < ${(precisionThreshold * 100).toFixed(0)}%)`
      );
    }
  }

  if (failures.length > 0) {
    console.error('P1 benchmark check failed');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `P1 benchmark check passed (${actualCanonical.cases.length} cases) using baseline ${args.baselinePath}`
  );
  process.exitCode = 0;
}

function runUpdateMode(args, liteReport) {
  const canonical = toCanonicalBaseline(liteReport);
  ensureDirectoryForFile(args.baselinePath);
  fs.writeFileSync(args.baselinePath, `${JSON.stringify(canonical, null, 2)}\n`, 'utf-8');
  console.log(`P1 baseline updated at ${args.baselinePath}`);
  process.exitCode = 0;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const liteReport = runLiteBenchmark(args);
  if (args.updateBaseline) {
    runUpdateMode(args, liteReport);
    return;
  }

  runCheckMode(args, liteReport);
}

try {
  main();
} catch (error) {
  console.error(`benchmark:p1 failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
