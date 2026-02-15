#!/usr/bin/env node

import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DEFAULT_FIXTURES = [
  'react-vite',
  'vue-vite',
  'runtime-npm',
  'firebase-with-functions',
  'monorepo-turbo',
  'monorepo-pnpm-workspace',
];
const VALID_PROFILES = ['compact', 'standard', 'full'];

import {
  SCORE_THRESHOLDS,
  COMMAND_PRECISION_THRESHOLDS,
} from './shared-constants.mjs';

const REQUIRED_SECTIONS = [
  'proposito del repositorio',
  'tech stack',
  'comandos canonicos',
  'definition of done',
  'estilo y convenciones',
  'seguridad',
];

const BLOCKING_PLACEHOLDER_REGEX = /\b(undefined|null)\b/gi;
const ADDITIONAL_PLACEHOLDER_REGEX = /\b(N\/A|TBD)\b/gi;
const UNKNOWN_TOKEN_REGEX = /\b(unknown|desconocido)\b/gi;

const TOOL_SPECIFIC_INSTRUCTION_REGEX =
  /\b(abre|usa|utiliza|ejecuta|run|open|use|haz)\b[\s\S]{0,80}\b(cursor|claude|copilot|windsurf|gemini|cline)\b|\b(en)\s+(cursor|claude|copilot|windsurf|gemini|cline)\b[\s\S]{0,80}\b(haz|run|open|use|usa|ejecuta)\b/i;

const LENGTH_WARNING_PREFIXES = ['Output is quite short', 'Output is too long'];

const PREVIEW_REGEX =
  /--- Preview \(\-\-dry-run mode\) ---\r?\n([\s\S]*?)\r?\n--- End of preview ---/;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const fixturesRoot = path.join(repoRoot, 'tests', 'fixtures');
const distCliPath = path.join(repoRoot, 'dist', 'cli.js');
const distValidatorsPath = path.join(repoRoot, 'dist', 'render', 'validators.js');

function normalizeText(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizeCommand(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function parseCsv(rawValue) {
  return rawValue
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function hashContent(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function extractPreview(stdout) {
  const match = stdout.match(PREVIEW_REGEX);
  if (!match) {
    throw new Error('Dry-run preview markers not found in CLI output');
  }
  return match[1];
}

function detectPackageManager(fixturePath, packageInfo) {
  const packageManagerField =
    typeof packageInfo.packageManager === 'string' ? packageInfo.packageManager : '';
  const normalizedPmField = packageManagerField.toLowerCase();

  if (fs.existsSync(path.join(fixturePath, 'yarn.lock')) || normalizedPmField.startsWith('yarn')) {
    return 'yarn';
  }

  if (
    fs.existsSync(path.join(fixturePath, 'pnpm-lock.yaml')) ||
    normalizedPmField.startsWith('pnpm')
  ) {
    return 'pnpm';
  }

  if (
    fs.existsSync(path.join(fixturePath, 'bun.lockb')) ||
    normalizedPmField.startsWith('bun')
  ) {
    return 'bun';
  }

  return 'npm';
}

function buildScriptCommandSet(scripts, packageManager) {
  const set = new Set();
  for (const scriptName of Object.keys(scripts || {})) {
    const normalizedScriptName = scriptName.trim();
    if (!normalizedScriptName) {
      continue;
    }

    if (packageManager === 'npm') {
      if (normalizedScriptName === 'start' || normalizedScriptName === 'test') {
        set.add(`npm ${normalizedScriptName}`);
      }
      set.add(`npm run ${normalizedScriptName}`);
      continue;
    }

    if (packageManager === 'yarn') {
      set.add(`yarn ${normalizedScriptName}`);
      set.add(`yarn run ${normalizedScriptName}`);
      continue;
    }

    if (packageManager === 'pnpm') {
      set.add(`pnpm ${normalizedScriptName}`);
      set.add(`pnpm run ${normalizedScriptName}`);
      continue;
    }

    if (packageManager === 'bun') {
      set.add(`bun run ${normalizedScriptName}`);
      continue;
    }
  }
  return new Set([...set].map(normalizeCommand));
}

function buildAllowlist(isFirebaseFixture) {
  const list = [
    'npm install',
    'npm ci',
    'pnpm install',
    'yarn',
    'yarn install',
    'bun install',
    'node --version',
  ];

  if (isFirebaseFixture) {
    list.push('firebase deploy --only functions');
  }

  return new Set(list.map(normalizeCommand));
}

function extractCanonicalCommands(markdownContent) {
  const lines = markdownContent.split(/\r?\n/);
  const normalizedLines = lines.map(normalizeText);

  const sectionStartIndex = normalizedLines.findIndex(
    line => line.startsWith('## ') && line.includes('comandos canonicos')
  );

  if (sectionStartIndex === -1) {
    return [];
  }

  const sectionEndIndex = normalizedLines.findIndex(
    (line, idx) => idx > sectionStartIndex && line.startsWith('## ')
  );

  const end = sectionEndIndex === -1 ? lines.length : sectionEndIndex;
  const sectionLines = lines.slice(sectionStartIndex + 1, end);

  const extracted = [];
  let insideCodeBlock = false;

  for (const rawLine of sectionLines) {
    const trimmed = rawLine.trim();
    if (trimmed.startsWith('```')) {
      insideCodeBlock = !insideCodeBlock;
      continue;
    }

    if (insideCodeBlock) {
      continue;
    }

    if (!/^[-*]\s+/.test(trimmed) || !trimmed.includes('`')) {
      continue;
    }

    const inlineCodeMatches = [...trimmed.matchAll(/`([^`]+)`/g)];
    for (const match of inlineCodeMatches) {
      const command = normalizeCommand(match[1]);
      if (command) {
        extracted.push(command);
      }
    }
  }

  return [...new Set(extracted)];
}

function findBlockingPlaceholders(content) {
  return [...new Set((content.match(BLOCKING_PLACEHOLDER_REGEX) || []).map(item => item.toLowerCase()))];
}

function findAdditionalPlaceholders(content) {
  return [...new Set((content.match(ADDITIONAL_PLACEHOLDER_REGEX) || []).map(item => item.toUpperCase()))];
}

function findToolSpecificLines(content) {
  const matches = [];
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    if (TOOL_SPECIFIC_INSTRUCTION_REGEX.test(line)) {
      matches.push(line.trim());
    }
  }
  return matches;
}

function findUnknownTokens(content) {
  const rawMatches = content.match(UNKNOWN_TOKEN_REGEX) || [];
  const hits = [];
  const seen = new Set();

  for (const match of rawMatches) {
    const normalized = match.toLowerCase();
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    hits.push(normalized);
  }

  return {
    hits,
    count: rawMatches.length,
  };
}

function scoreStructure(content) {
  const levelTwoHeadings = content
    .split(/\r?\n/)
    .filter(line => /^##\s+/.test(line))
    .map(line => normalizeText(line.replace(/^##\s+/, '')));

  const presentSections = REQUIRED_SECTIONS.filter(requiredSection =>
    levelTwoHeadings.some(heading => heading.includes(requiredSection))
  );

  if (presentSections.length === REQUIRED_SECTIONS.length) {
    return {
      score: 2,
      presentSections,
    };
  }

  if (presentSections.length >= 4) {
    return {
      score: 1,
      presentSections,
    };
  }

  return {
    score: 0,
    presentSections,
  };
}

function getNormalizedH2Headings(content) {
  return content
    .split(/\r?\n/)
    .filter(line => /^##\s+/.test(line))
    .map(line => normalizeText(line.replace(/^##\s+/, '')));
}

function buildSemanticSnapshot({
  content,
  extractedCommands,
  blockingPlaceholderHits,
  lockInHits,
  sectionWarnings,
}) {
  const h2HeadingsNormalized = getNormalizedH2Headings(content);
  const requiredSectionsPresent = REQUIRED_SECTIONS.filter(requiredSection =>
    h2HeadingsNormalized.some(heading => heading.includes(requiredSection))
  ).sort();
  const requiredSectionsMissing = REQUIRED_SECTIONS.filter(
    requiredSection => !requiredSectionsPresent.includes(requiredSection)
  ).sort();

  return {
    h2HeadingsNormalized,
    requiredSectionsPresent,
    requiredSectionsMissing,
    canonicalCommands: [...new Set(extractedCommands)].sort(),
    canonicalCommandCount: extractedCommands.length,
    hasBlockingPlaceholders: blockingPlaceholderHits.length > 0,
    hasToolSpecificInstructions: lockInHits.length > 0,
    emptySectionCount: sectionWarnings.length,
  };
}

function scoreActionability(commandCount, precision, threshold) {
  if (commandCount === 0) {
    return 0;
  }
  if (precision >= threshold) {
    return 2;
  }
  if (precision >= 0.8) {
    return 1;
  }
  return 0;
}

function scoreExactness(precision, threshold) {
  if (precision >= threshold) {
    return 2;
  }
  if (precision >= 0.8) {
    return 1;
  }
  return 0;
}

function parseArgs(argv) {
  const parsed = {
    fixtures: null,
    profiles: null,
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

    if (arg === '--json-only') {
      parsed.jsonOnly = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return parsed;
}

function loadPackageInfo(fixturePath) {
  const packageJsonPath = path.join(fixturePath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`Missing package.json in fixture: ${fixturePath}`);
  }

  const raw = fs.readFileSync(packageJsonPath, 'utf-8');
  return JSON.parse(raw);
}

function runCliDryRun(fixturePath, profile) {
  return spawnSync(
    process.execPath,
    [distCliPath, 'init', fixturePath, '--dry-run', '--profile', profile],
    {
      cwd: repoRoot,
      encoding: 'utf-8',
    }
  );
}

function collectLineTokenWarnings(warnings) {
  return warnings.filter(warning =>
    LENGTH_WARNING_PREFIXES.some(prefix => warning.startsWith(prefix))
  );
}

async function main() {
  if (!fs.existsSync(distCliPath) || !fs.existsSync(distValidatorsPath)) {
    throw new Error(
      'Missing dist artifacts. Run "npm run build" before "npm run benchmark:lite".'
    );
  }

  const args = parseArgs(process.argv.slice(2));
  const fixtureDirEntries = fs
    .readdirSync(fixturesRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);

  const selectedFixtures = args.fixtures ?? DEFAULT_FIXTURES;
  const selectedProfiles = args.profiles ?? VALID_PROFILES;

  const unknownFixtures = selectedFixtures.filter(name => !fixtureDirEntries.includes(name));
  if (unknownFixtures.length > 0) {
    throw new Error(
      `Unknown fixture(s): ${unknownFixtures.join(', ')}. Available: ${fixtureDirEntries.join(', ')}`
    );
  }

  const invalidProfiles = selectedProfiles.filter(profile => !VALID_PROFILES.includes(profile));
  if (invalidProfiles.length > 0) {
    throw new Error(
      `Invalid profile(s): ${invalidProfiles.join(', ')}. Valid profiles: ${VALID_PROFILES.join(', ')}`
    );
  }

  const { validateOutput } = await import(pathToFileURL(distValidatorsPath).href);

  const cases = [];
  for (const fixture of selectedFixtures) {
    const fixturePath = path.join(fixturesRoot, fixture);
    const packageInfo = loadPackageInfo(fixturePath);
    const scripts = packageInfo.scripts || {};
    const packageManager = detectPackageManager(fixturePath, packageInfo);
    const dependencies = {
      ...(packageInfo.dependencies || {}),
      ...(packageInfo.devDependencies || {}),
    };
    const isFirebaseFixture = Boolean(dependencies['firebase-functions']);
    const scriptCommandSet = buildScriptCommandSet(scripts, packageManager);
    const allowlist = buildAllowlist(isFirebaseFixture);

    for (const profile of selectedProfiles) {
      const firstRun = runCliDryRun(fixturePath, profile);
      const caseResult = {
        fixture,
        profile,
        status: 'fail',
        deterministic: false,
        hashes: {
          run1: null,
          run2: null,
        },
        score: {
          total: 0,
          threshold: SCORE_THRESHOLDS[profile],
          criteria: {
            clarityStructure: 0,
            actionability: 0,
            exactness: 0,
            concisionDensity: 0,
            multiToolCompatibility: 0,
            determinism: 0,
          },
        },
        commands: {
          packageManager,
          extracted: [],
          valid: [],
          invalid: [],
          precision: 0,
          threshold: COMMAND_PRECISION_THRESHOLDS[profile],
        },
        validation: {
          lineCount: 0,
          estimatedTokens: 0,
          lineTokenWarnings: [],
          sectionWarnings: [],
          additionalPlaceholderWarnings: [],
          blockingPlaceholderHits: [],
          unknownTokenHits: [],
          unknownTokenCount: 0,
          lockInHits: [],
          validatorErrors: [],
        },
        semantic: {
          h2HeadingsNormalized: [],
          requiredSectionsPresent: [],
          requiredSectionsMissing: [],
          canonicalCommands: [],
          canonicalCommandCount: 0,
          hasBlockingPlaceholders: false,
          hasToolSpecificInstructions: false,
          emptySectionCount: 0,
        },
        gateFailures: [],
      };

      if (firstRun.status !== 0) {
        caseResult.gateFailures.push(
          `CLI failed (run 1): ${firstRun.stderr.trim() || 'unknown error'}`
        );
        caseResult.status = 'fail';
        cases.push(caseResult);
        continue;
      }

      let firstPreview;
      try {
        firstPreview = extractPreview(firstRun.stdout);
      } catch (error) {
        caseResult.gateFailures.push(
          `Failed to parse preview (run 1): ${error instanceof Error ? error.message : String(error)}`
        );
        caseResult.status = 'fail';
        cases.push(caseResult);
        continue;
      }

      const secondRun = runCliDryRun(fixturePath, profile);
      if (secondRun.status !== 0) {
        caseResult.gateFailures.push(
          `CLI failed (run 2): ${secondRun.stderr.trim() || 'unknown error'}`
        );
        caseResult.status = 'fail';
        cases.push(caseResult);
        continue;
      }

      let secondPreview;
      try {
        secondPreview = extractPreview(secondRun.stdout);
      } catch (error) {
        caseResult.gateFailures.push(
          `Failed to parse preview (run 2): ${error instanceof Error ? error.message : String(error)}`
        );
        caseResult.status = 'fail';
        cases.push(caseResult);
        continue;
      }

      const run1Hash = hashContent(firstPreview);
      const run2Hash = hashContent(secondPreview);
      const deterministic = firstPreview === secondPreview;

      caseResult.deterministic = deterministic;
      caseResult.hashes.run1 = run1Hash;
      caseResult.hashes.run2 = run2Hash;

      const validation = validateOutput(firstPreview, profile);
      caseResult.validation.lineCount = validation.lineCount;
      caseResult.validation.estimatedTokens = validation.estimatedTokens;
      caseResult.validation.lineTokenWarnings = collectLineTokenWarnings(validation.warnings);
      caseResult.validation.sectionWarnings = validation.warnings.filter(w =>
        w.includes('appears to be empty')
      );
      caseResult.validation.validatorErrors = validation.errors;

      const blockingPlaceholderHits = findBlockingPlaceholders(firstPreview);
      const additionalPlaceholderWarnings = findAdditionalPlaceholders(firstPreview);
      const unknownTokenData = findUnknownTokens(firstPreview);
      const lockInHits = findToolSpecificLines(firstPreview);

      caseResult.validation.blockingPlaceholderHits = blockingPlaceholderHits;
      caseResult.validation.additionalPlaceholderWarnings = additionalPlaceholderWarnings;
      caseResult.validation.unknownTokenHits = unknownTokenData.hits;
      caseResult.validation.unknownTokenCount = unknownTokenData.count;
      caseResult.validation.lockInHits = lockInHits;

      const extractedCommands = extractCanonicalCommands(firstPreview);
      const normalizedExtractedCommands = extractedCommands.map(normalizeCommand);
      const validCommands = [];
      const invalidCommands = [];
      for (const command of normalizedExtractedCommands) {
        if (scriptCommandSet.has(command) || allowlist.has(command)) {
          validCommands.push(command);
        } else {
          invalidCommands.push(command);
        }
      }

      const commandCount = normalizedExtractedCommands.length;
      const precision = commandCount === 0 ? 0 : validCommands.length / commandCount;
      const precisionThreshold = COMMAND_PRECISION_THRESHOLDS[profile];

      caseResult.commands.extracted = normalizedExtractedCommands;
      caseResult.commands.valid = validCommands;
      caseResult.commands.invalid = invalidCommands;
      caseResult.commands.precision = precision;
      caseResult.semantic = buildSemanticSnapshot({
        content: firstPreview,
        extractedCommands: normalizedExtractedCommands,
        blockingPlaceholderHits,
        lockInHits,
        sectionWarnings: caseResult.validation.sectionWarnings,
      });

      const structureScore = scoreStructure(firstPreview);
      const actionabilityScore = scoreActionability(
        commandCount,
        precision,
        precisionThreshold
      );
      const exactnessScore = scoreExactness(precision, precisionThreshold);
      const concisionScore = 2;
      const compatibilityScore = lockInHits.length === 0 ? 2 : 0;
      const determinismScore = deterministic ? 1 : 0;

      const scoreTotal =
        structureScore.score +
        actionabilityScore +
        exactnessScore +
        concisionScore +
        compatibilityScore +
        determinismScore;

      caseResult.score.total = scoreTotal;
      caseResult.score.criteria.clarityStructure = structureScore.score;
      caseResult.score.criteria.actionability = actionabilityScore;
      caseResult.score.criteria.exactness = exactnessScore;
      caseResult.score.criteria.concisionDensity = concisionScore;
      caseResult.score.criteria.multiToolCompatibility = compatibilityScore;
      caseResult.score.criteria.determinism = determinismScore;

      if (!deterministic) {
        caseResult.gateFailures.push('Determinism check failed: run1 != run2');
      }

      if (blockingPlaceholderHits.length > 0) {
        caseResult.gateFailures.push(
          `Blocking placeholders found: ${blockingPlaceholderHits.join(', ')}`
        );
      }

      if (caseResult.validation.sectionWarnings.length > 0) {
        caseResult.gateFailures.push(
          `Empty sections detected: ${caseResult.validation.sectionWarnings.join(' | ')}`
        );
      }

      if (lockInHits.length > 0) {
        caseResult.gateFailures.push('Tool-specific instructions detected');
      }

      if (commandCount === 0) {
        caseResult.gateFailures.push('No canonical commands found under "## Comandos canónicos"');
      }

      if (precision < precisionThreshold) {
        caseResult.gateFailures.push(
          `Command precision below threshold (${(precision * 100).toFixed(2)}% < ${(
            precisionThreshold * 100
          ).toFixed(0)}%)`
        );
      }

      if (validation.errors.length > 0) {
        caseResult.gateFailures.push(`Validation errors: ${validation.errors.join(' | ')}`);
      }

      if (scoreTotal < SCORE_THRESHOLDS[profile]) {
        caseResult.gateFailures.push(
          `Score below threshold (${scoreTotal}/11 < ${SCORE_THRESHOLDS[profile]}/11)`
        );
      }

      caseResult.status = caseResult.gateFailures.length === 0 ? 'pass' : 'fail';
      cases.push(caseResult);
    }
  }

  const failedCases = cases.filter(item => item.status === 'fail');
  const summary = {
    totalCases: cases.length,
    passedCases: cases.length - failedCases.length,
    failedCases: failedCases.length,
    gatePassed: failedCases.length === 0,
  };

  const report = {
    mode: 'lite',
    fixtures: selectedFixtures,
    profiles: selectedProfiles,
    summary,
    cases,
  };

  if (!args.jsonOnly) {
    console.log('Benchmark Lite Summary');
    for (const item of cases) {
      const label = item.status === 'pass' ? 'PASS' : 'FAIL';
      const precisionPct = (item.commands.precision * 100).toFixed(2);
      console.log(
        `[${label}] ${item.fixture}/${item.profile} score=${item.score.total}/11 precision=${precisionPct}% deterministic=${item.deterministic}`
      );
      if (item.gateFailures.length > 0) {
        console.log(`  Gate failures: ${item.gateFailures.join(' | ')}`);
      }
      if (item.validation.lineTokenWarnings.length > 0) {
        console.log(`  Warnings: ${item.validation.lineTokenWarnings.join(' | ')}`);
      }
      if (item.validation.additionalPlaceholderWarnings.length > 0) {
        console.log(
          `  Additional placeholder warnings: ${item.validation.additionalPlaceholderWarnings.join(', ')}`
        );
      }
    }
    console.log(
      `Total cases: ${summary.totalCases} | Passed: ${summary.passedCases} | Failed: ${summary.failedCases}`
    );
    console.log(`Benchmark result: ${summary.gatePassed ? 'PASS' : 'FAIL'}`);
    console.log('--- Benchmark Lite JSON ---');
  }

  console.log(JSON.stringify(report, null, 2));
  process.exitCode = summary.gatePassed ? 0 : 1;
}

main().catch(error => {
  console.error(`Benchmark lite failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
