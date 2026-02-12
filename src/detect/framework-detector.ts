/**
 * Framework detection based on dependencies
 */

import { FrameworkInfo, PackageInfo, FrameworkType } from '../types.js';

export function detectFramework(packageInfo: PackageInfo): FrameworkInfo {
  const deps = packageInfo.dependencies || {};
  const devDeps = packageInfo.devDependencies || {};
  const allDeps = { ...deps, ...devDeps };

  const indicators: string[] = [];

  // React detection (highest priority)
  if (deps.react && deps['react-dom']) {
    indicators.push('react + react-dom in dependencies');

    // Check if it's Next.js
    if (deps.next) {
      return {
        type: 'next',
        version: deps.next,
        confidence: 'high',
        indicators: [...indicators, 'next in dependencies'],
      };
    }

    return {
      type: 'react',
      version: deps.react,
      confidence: 'high',
      indicators,
    };
  }

  // Vue detection
  if (deps.vue) {
    indicators.push('vue in dependencies');

    // Check if it's Nuxt
    if (deps.nuxt) {
      return {
        type: 'nuxt',
        version: deps.nuxt,
        confidence: 'high',
        indicators: [...indicators, 'nuxt in dependencies'],
      };
    }

    return {
      type: 'vue',
      version: deps.vue,
      confidence: 'high',
      indicators,
    };
  }

  // Angular detection
  if (deps['@angular/core']) {
    return {
      type: 'angular',
      version: deps['@angular/core'],
      confidence: 'high',
      indicators: ['@angular/core in dependencies'],
    };
  }

  // Svelte detection
  if (allDeps.svelte) {
    return {
      type: 'svelte',
      version: allDeps.svelte,
      confidence: 'high',
      indicators: ['svelte in dependencies'],
    };
  }

  // Firebase Functions detection
  if (deps['firebase-functions']) {
    return {
      type: 'firebase-functions',
      version: deps['firebase-functions'],
      confidence: 'high',
      indicators: ['firebase-functions in dependencies'],
    };
  }

  // Express detection
  if (deps.express) {
    return {
      type: 'express',
      version: deps.express,
      confidence: 'medium',
      indicators: ['express in dependencies'],
    };
  }

  // Fastify detection
  if (deps.fastify) {
    return {
      type: 'fastify',
      version: deps.fastify,
      confidence: 'medium',
      indicators: ['fastify in dependencies'],
    };
  }

  // Unknown framework
  return {
    type: 'unknown',
    confidence: 'low',
    indicators: ['No recognized framework detected'],
  };
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
