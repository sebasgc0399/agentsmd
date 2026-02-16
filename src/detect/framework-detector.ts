/**
 * Framework detection based on dependencies
 */

import fs from 'fs';
import path from 'path';
import { FrameworkInfo, PackageInfo, FrameworkType } from '../types.js';

type RootPathOptions = string | { rootPath?: string };
type SignalStrength = 'strong' | 'medium' | 'weak';
type KnownFrameworkType = Exclude<FrameworkType, 'unknown'>;

const SIGNAL_WEIGHTS: Record<SignalStrength, number> = {
  strong: 3,
  medium: 1,
  weak: 0.5,
};

const HIGH_CONFIDENCE_THRESHOLD = 4;
const MEDIUM_CONFIDENCE_THRESHOLD = 3;
const CLASSIFICATION_FLOOR = 3;

const PRECEDENCE_RULES = new Set([
  'next>react',
  'nuxt>vue',
  'sveltekit>svelte',
  'express>fastify',
]);

interface DetectionContext {
  allDeps: Record<string, string>;
  depNames: Set<string>;
  scripts: string[];
  rootPath?: string;
}

interface SignalDefinition {
  strength: SignalStrength;
  indicator: string;
  match: (ctx: DetectionContext) => boolean;
}

interface FrameworkDefinition {
  type: KnownFrameworkType;
  versionDeps: string[];
  signals: SignalDefinition[];
  guard?: (ctx: DetectionContext) => boolean;
  guardDescription?: string;
}

interface ScoredFramework {
  type: KnownFrameworkType;
  score: number;
  version?: string;
  indicators: string[];
}

const FRAMEWORK_DEFINITIONS: FrameworkDefinition[] = [
  {
    type: 'next',
    versionDeps: ['next'],
    signals: [
      depSignal('next', 'next dependency'),
      fileSignal(['next.config.js', 'next.config.mjs', 'next.config.ts'], 'next.config.* file'),
      scriptSignal('next dev', 'script contains "next dev"'),
      dirSignal('pages', 'pages/ directory'),
    ],
  },
  {
    type: 'react',
    versionDeps: ['react', 'react-dom'],
    signals: [
      depSignal('react', 'react dependency'),
      depSignal('react-dom', 'react-dom dependency'),
      mediumDepSignal('react-scripts', 'react-scripts dependency'),
      scriptSignal('react-scripts', 'script contains react-scripts'),
      weakFileSignal(
        ['src/App.js', 'src/App.jsx', 'src/App.ts', 'src/App.tsx'],
        'src/App.* file'
      ),
    ],
  },
  {
    type: 'nuxt',
    versionDeps: ['nuxt'],
    signals: [
      depSignal('nuxt', 'nuxt dependency'),
      fileSignal(['nuxt.config.js', 'nuxt.config.mjs', 'nuxt.config.ts'], 'nuxt.config.* file'),
      scriptSignal('nuxt dev', 'script contains "nuxt dev"'),
    ],
  },
  {
    type: 'vue',
    versionDeps: ['vue'],
    signals: [
      depSignal('vue', 'vue dependency'),
      mediumDepSignal('@vue/cli-service', '@vue/cli-service dependency'),
      scriptSignal('vue-cli-service', 'script contains vue-cli-service'),
      weakFileSignal(['vue.config.js', 'vue.config.ts'], 'vue.config.* file'),
    ],
  },
  {
    type: 'angular',
    versionDeps: ['@angular/core', '@angular/cli'],
    signals: [
      fileSignal(['angular.json'], 'angular.json file'),
      depSignal('@angular/core', '@angular/core dependency'),
      depSignal('@angular/cli', '@angular/cli dependency'),
      scriptSignal('ng serve', 'script contains "ng serve"'),
      scriptSignal('ng build', 'script contains "ng build"'),
    ],
    guard: ctx =>
      hasAnyFile(ctx, ['angular.json']) ||
      (hasDependency(ctx, '@angular/core') && hasDependency(ctx, '@angular/cli')),
    guardDescription: 'requires angular.json or both @angular/core and @angular/cli',
  },
  {
    type: 'sveltekit',
    versionDeps: ['@sveltejs/kit', 'svelte'],
    signals: [
      fileSignal(['svelte.config.js'], 'svelte.config.js file'),
      depSignal('@sveltejs/kit', '@sveltejs/kit dependency'),
      depSignal('svelte', 'svelte dependency'),
      scriptSignal('svelte-kit dev', 'script contains "svelte-kit dev"'),
    ],
    guard: ctx => hasAnyFile(ctx, ['svelte.config.js']),
    guardDescription: 'requires svelte.config.js',
  },
  {
    type: 'astro',
    versionDeps: ['astro'],
    signals: [
      fileSignal(['astro.config.mjs', 'astro.config.js', 'astro.config.ts'], 'astro.config.* file'),
      depSignal('astro', 'astro dependency'),
      scriptSignal('astro dev', 'script contains "astro dev"'),
    ],
    guard: ctx =>
      hasAnyFile(ctx, ['astro.config.mjs', 'astro.config.js', 'astro.config.ts']) &&
      hasDependency(ctx, 'astro'),
    guardDescription: 'requires astro.config.* and astro dependency',
  },
  {
    type: 'nestjs',
    versionDeps: ['@nestjs/core', '@nestjs/cli', '@nestjs/common'],
    signals: [
      fileSignal(['nest-cli.json'], 'nest-cli.json file'),
      depSignal('@nestjs/core', '@nestjs/core dependency'),
      depSignal('@nestjs/common', '@nestjs/common dependency'),
      depSignal('@nestjs/cli', '@nestjs/cli dependency'),
      scriptSignal('nest start', 'script contains "nest start"'),
    ],
    guard: ctx => hasAnyFile(ctx, ['nest-cli.json']),
    guardDescription: 'requires nest-cli.json',
  },
  {
    type: 'svelte',
    versionDeps: ['svelte'],
    signals: [
      fileSignal(['svelte.config.js'], 'svelte.config.js file'),
      depSignal('svelte', 'svelte dependency'),
      scriptSignal('svelte', 'script contains "svelte"'),
    ],
    guard: ctx => hasAnyFile(ctx, ['svelte.config.js']),
    guardDescription: 'requires svelte.config.js',
  },
  {
    type: 'firebase-functions',
    versionDeps: ['firebase-functions'],
    signals: [
      depSignal('firebase-functions', 'firebase-functions dependency'),
      mediumFileSignal(['firebase.json'], 'firebase.json file'),
      mediumDirSignal('functions', 'functions/ directory'),
    ],
  },
  {
    type: 'express',
    versionDeps: ['express'],
    signals: [depSignal('express', 'express dependency')],
  },
  {
    type: 'fastify',
    versionDeps: ['fastify'],
    signals: [depSignal('fastify', 'fastify dependency')],
  },
];

export function detectFramework(
  packageInfo: PackageInfo,
  rootPathOrOptions?: RootPathOptions
): FrameworkInfo {
  const rootPath = normalizeRootPath(rootPathOrOptions);
  const deps = packageInfo.dependencies || {};
  const devDeps = packageInfo.devDependencies || {};
  const allDeps = { ...deps, ...devDeps };
  const scripts = normalizeScripts(packageInfo.scripts || {});
  const context: DetectionContext = {
    allDeps,
    depNames: new Set(Object.keys(allDeps)),
    scripts,
    rootPath,
  };

  const candidates: ScoredFramework[] = [];
  const guardFailures: string[] = [];

  for (const definition of FRAMEWORK_DEFINITIONS) {
    const indicators: string[] = [];
    let score = 0;

    for (const signal of definition.signals) {
      if (signal.match(context)) {
        score += SIGNAL_WEIGHTS[signal.strength];
        indicators.push(`${signal.strength}: ${signal.indicator}`);
      }
    }

    if (score < CLASSIFICATION_FLOOR) {
      continue;
    }

    if (definition.guard && !definition.guard(context)) {
      guardFailures.push(
        `${definition.type} guard failed: ${definition.guardDescription || 'missing required signals'}`
      );
      continue;
    }

    const version = selectVersion(definition.versionDeps, allDeps);
    candidates.push({
      type: definition.type,
      score,
      version,
      indicators,
    });
  }

  if (candidates.length === 0) {
    return {
      type: 'unknown',
      confidence: 'low',
      indicators:
        guardFailures.length > 0
          ? guardFailures
          : ['No recognized framework detected'],
    };
  }

  const maxScore = Math.max(...candidates.map(candidate => candidate.score));
  const topCandidates = candidates.filter(candidate => candidate.score === maxScore);
  let winner: ScoredFramework | undefined;

  if (topCandidates.length === 1) {
    winner = topCandidates[0];
  } else {
    const precedenceFilteredTypes = filterByPrecedence(
      topCandidates.map(candidate => candidate.type)
    );
    const precedenceWinners = topCandidates.filter(candidate =>
      precedenceFilteredTypes.includes(candidate.type)
    );

    if (precedenceWinners.length === 1) {
      winner = precedenceWinners[0];
    } else {
      return {
        type: 'unknown',
        confidence: 'low',
        indicators: [
          `Ambiguous framework signals without precedence winner: ${topCandidates
            .map(candidate => candidate.type)
            .join(', ')}`,
        ],
      };
    }
  }

  if (!winner) {
    return {
      type: 'unknown',
      confidence: 'low',
      indicators: ['No recognized framework detected'],
    };
  }

  const confidence = scoreToConfidence(winner.score);
  if (confidence === 'low') {
    return {
      type: 'unknown',
      confidence: 'low',
      indicators: ['No recognized framework detected'],
    };
  }

  return {
    type: winner.type,
    version: winner.version,
    confidence,
    indicators: winner.indicators,
  };
}

function normalizeRootPath(rootPathOrOptions?: RootPathOptions): string | undefined {
  if (typeof rootPathOrOptions === 'string') {
    return rootPathOrOptions;
  }

  if (
    rootPathOrOptions &&
    typeof rootPathOrOptions === 'object' &&
    typeof rootPathOrOptions.rootPath === 'string'
  ) {
    return rootPathOrOptions.rootPath;
  }

  return undefined;
}

function normalizeScripts(scripts: Record<string, string>): string[] {
  return Object.keys(scripts)
    .sort()
    .map(name => scripts[name])
    .filter((value): value is string => typeof value === 'string')
    .map(value => value.toLowerCase());
}

function depSignal(depName: string, indicator: string): SignalDefinition {
  return {
    strength: 'strong',
    indicator,
    match: ctx => hasDependency(ctx, depName),
  };
}

function mediumDepSignal(depName: string, indicator: string): SignalDefinition {
  return {
    strength: 'medium',
    indicator,
    match: ctx => hasDependency(ctx, depName),
  };
}

function scriptSignal(scriptMatch: string, indicator: string): SignalDefinition {
  const normalized = scriptMatch.toLowerCase();
  return {
    strength: 'medium',
    indicator,
    match: ctx => ctx.scripts.some(script => script.includes(normalized)),
  };
}

function fileSignal(fileNames: string[], indicator: string): SignalDefinition {
  return {
    strength: 'strong',
    indicator,
    match: ctx => hasAnyFile(ctx, fileNames),
  };
}

function weakFileSignal(fileNames: string[], indicator: string): SignalDefinition {
  return {
    strength: 'weak',
    indicator,
    match: ctx => hasAnyFile(ctx, fileNames),
  };
}

function mediumFileSignal(fileNames: string[], indicator: string): SignalDefinition {
  return {
    strength: 'medium',
    indicator,
    match: ctx => hasAnyFile(ctx, fileNames),
  };
}

function dirSignal(dirName: string, indicator: string): SignalDefinition {
  return {
    strength: 'medium',
    indicator,
    match: ctx => hasDirectory(ctx, dirName),
  };
}

function mediumDirSignal(dirName: string, indicator: string): SignalDefinition {
  return {
    strength: 'medium',
    indicator,
    match: ctx => hasDirectory(ctx, dirName),
  };
}

function hasDependency(ctx: DetectionContext, depName: string): boolean {
  return ctx.depNames.has(depName);
}

function hasAnyFile(ctx: DetectionContext, fileNames: string[]): boolean {
  if (!ctx.rootPath) {
    return false;
  }

  const sortedFileNames = [...fileNames].sort();
  return sortedFileNames.some(fileName => {
    try {
      const fullPath = path.join(ctx.rootPath as string, fileName);
      return fs.existsSync(fullPath) && fs.statSync(fullPath).isFile();
    } catch {
      return false;
    }
  });
}

function hasDirectory(ctx: DetectionContext, dirName: string): boolean {
  if (!ctx.rootPath) {
    return false;
  }

  try {
    const fullPath = path.join(ctx.rootPath, dirName);
    return fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
  } catch {
    return false;
  }
}

function selectVersion(
  candidates: string[],
  dependencies: Record<string, string>
): string | undefined {
  for (const candidate of candidates) {
    if (dependencies[candidate]) {
      return dependencies[candidate];
    }
  }
  return undefined;
}

function scoreToConfidence(score: number): FrameworkInfo['confidence'] {
  if (score >= HIGH_CONFIDENCE_THRESHOLD) {
    return 'high';
  }
  if (score >= MEDIUM_CONFIDENCE_THRESHOLD) {
    return 'medium';
  }
  if (score >= 1) {
    return 'low';
  }
  return 'low';
}

function filterByPrecedence(types: KnownFrameworkType[]): KnownFrameworkType[] {
  return types.filter(candidate => {
    return !types.some(
      other => other !== candidate && PRECEDENCE_RULES.has(`${other}>${candidate}`)
    );
  });
}

/**
 * Detect build tools
 */
export function detectBuildTools(packageInfo: PackageInfo): string[] {
  const devDeps = packageInfo.devDependencies || {};
  const tools: string[] = [];

  if (devDeps.vite) tools.push('Vite');
  if (devDeps.webpack) tools.push('Webpack');
  if (devDeps.turbo) tools.push('Turbo');
  if (devDeps.nx) tools.push('Nx');
  if (devDeps.rollup) tools.push('Rollup');
  if (devDeps.esbuild) tools.push('esbuild');
  if (devDeps.parcel) tools.push('Parcel');

  return tools;
}
