import fs from 'fs';
import { describe, it, expect } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import { detectFramework, detectBuildTools } from '../../src/detect/framework-detector.js';
import { PackageInfo } from '../../src/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const fixturesDir = path.join(repoRoot, 'tests', 'fixtures');

function fixturePath(name: string): string {
  return path.join(fixturesDir, name);
}

function fixturePackageInfo(name: string): PackageInfo {
  const packageJsonPath = path.join(fixturePath(name), 'package.json');
  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as PackageInfo;
}

describe('detectFramework', () => {
  it('should detect React with high confidence', () => {
    const packageInfo: PackageInfo = {
      name: 'test',
      scripts: {},
      dependencies: {
        react: '^18.3.0',
        'react-dom': '^18.3.0',
      },
      devDependencies: {},
    };

    const framework = detectFramework(packageInfo);

    expect(framework.type).toBe('react');
    expect(framework.confidence).toBe('high');
    expect(framework.version).toBe('^18.3.0');
  });

  it('should apply precedence next > react when scores are tied', () => {
    const packageInfo: PackageInfo = {
      name: 'test',
      scripts: {},
      dependencies: {
        react: '^18.3.0',
        'react-dom': '^18.3.0',
        next: '^14.0.0',
      },
      devDependencies: {},
    };

    const framework = detectFramework(packageInfo, fixturePath('precedence-next-react'));

    expect(framework.type).toBe('next');
    expect(framework.confidence).toBe('high');
  });

  it('should resolve synthetic next/react tie to next', () => {
    const packageInfo: PackageInfo = {
      name: 'synthetic-tie-next-react',
      scripts: {},
      dependencies: {
        react: '^18.3.0',
        next: '^14.0.0',
      },
      devDependencies: {},
    };

    const framework = detectFramework(packageInfo);

    expect(framework.type).toBe('next');
    expect(framework.confidence).toBe('medium');
  });

  it('should not apply precedence when react has a higher score than next', () => {
    const packageInfo: PackageInfo = {
      name: 'test',
      scripts: {
        dev: 'next dev',
      },
      dependencies: {
        react: '^18.3.0',
        'react-dom': '^18.3.0',
        next: '^14.0.0',
      },
      devDependencies: {},
    };

    const framework = detectFramework(packageInfo);

    expect(framework.type).toBe('react');
    expect(framework.confidence).toBe('high');
  });

  it('should keep react as winner in synthetic near-tie with higher score', () => {
    const packageInfo: PackageInfo = {
      name: 'synthetic-near-tie-next-react',
      scripts: {},
      dependencies: {
        react: '^18.3.0',
        'react-dom': '^18.3.0',
        next: '^14.0.0',
      },
      devDependencies: {},
    };

    const framework = detectFramework(packageInfo);

    expect(framework.type).toBe('react');
    expect(framework.confidence).toBe('high');
  });

  it('should detect Firebase Functions from dependency in package-only mode', () => {
    const packageInfo: PackageInfo = {
      name: 'test',
      scripts: {},
      dependencies: {
        'firebase-functions': '^4.5.0',
      },
      devDependencies: {},
    };

    const framework = detectFramework(packageInfo);

    expect(framework.type).toBe('firebase-functions');
    expect(framework.confidence).toBe('medium');
  });

  it('should detect Nuxt even when Vue is not explicitly listed', () => {
    const packageInfo: PackageInfo = {
      name: 'test',
      scripts: {},
      dependencies: {
        nuxt: '^3.12.0',
      },
      devDependencies: {},
    };

    const framework = detectFramework(packageInfo);

    expect(framework.type).toBe('nuxt');
    expect(framework.confidence).toBe('medium');
    expect(framework.version).toBe('^3.12.0');
  });

  it('should detect Angular from fixture signals with rootPath', () => {
    const packageInfo: PackageInfo = {
      name: 'angular-simple-fixture',
      scripts: {
        dev: 'ng serve',
        build: 'ng build',
      },
      dependencies: {
        '@angular/core': '^17.0.0',
        '@angular/cli': '^17.0.0',
      },
      devDependencies: {},
    };

    const framework = detectFramework(packageInfo, fixturePath('angular-simple'));

    expect(framework.type).toBe('angular');
    expect(framework.confidence).toBe('high');
  });

  it('should return unknown for angular ambiguous signals without angular.json', () => {
    const packageInfo: PackageInfo = {
      name: 'angular-ambiguous-fixture',
      scripts: {
        dev: 'ng serve',
      },
      dependencies: {
        '@angular/core': '^17.0.0',
      },
      devDependencies: {},
    };

    const framework = detectFramework(packageInfo, fixturePath('angular-ambiguous'));

    expect(framework.type).toBe('unknown');
    expect(framework.confidence).toBe('low');
  });

  it('should detect SvelteKit with required config file', () => {
    const packageInfo: PackageInfo = {
      name: 'sveltekit-simple-fixture',
      scripts: {
        dev: 'svelte-kit dev',
      },
      dependencies: {
        '@sveltejs/kit': '^2.0.0',
        svelte: '^5.0.0',
      },
      devDependencies: {},
    };

    const framework = detectFramework(packageInfo, fixturePath('sveltekit-simple'));

    expect(framework.type).toBe('sveltekit');
    expect(framework.confidence).toBe('high');
  });

  it('should detect svelte for svelte fixture without @sveltejs/kit', () => {
    const packageInfo: PackageInfo = {
      name: 'svelte-simple-fixture',
      scripts: {
        dev: 'vite dev',
        build: 'vite build',
        test: 'vitest run',
      },
      dependencies: {
        svelte: '^5.0.0',
      },
      devDependencies: {
        vite: '^5.0.0',
        '@sveltejs/vite-plugin-svelte': '^3.0.0',
        vitest: '^1.0.0',
      },
    };

    const framework = detectFramework(packageInfo, fixturePath('svelte-simple'));

    expect(framework.type).toBe('svelte');
    expect(framework.confidence).toBe('high');
  });

  it('should return unknown for svelte-only ambiguous fixture', () => {
    const packageInfo: PackageInfo = {
      name: 'sveltekit-ambiguous-fixture',
      scripts: {},
      dependencies: {
        svelte: '^5.0.0',
      },
      devDependencies: {},
    };

    const framework = detectFramework(packageInfo, fixturePath('sveltekit-ambig'));

    expect(framework.type).toBe('unknown');
    expect(framework.confidence).toBe('low');
  });

  it('should detect Astro when config file and dependency exist', () => {
    const packageInfo: PackageInfo = {
      name: 'astro-simple-fixture',
      scripts: {
        dev: 'astro dev',
      },
      dependencies: {
        astro: '^4.0.0',
      },
      devDependencies: {},
    };

    const framework = detectFramework(packageInfo, fixturePath('astro-simple'));

    expect(framework.type).toBe('astro');
    expect(framework.confidence).toBe('high');
  });

  it('should accept rootPath via options object', () => {
    const packageInfo: PackageInfo = {
      name: 'astro-simple-fixture',
      scripts: {
        dev: 'astro dev',
      },
      dependencies: {
        astro: '^4.0.0',
      },
      devDependencies: {},
    };

    const framework = detectFramework(packageInfo, {
      rootPath: fixturePath('astro-simple'),
    });

    expect(framework.type).toBe('astro');
  });

  it('should return unknown for Astro in package-only mode without rootPath', () => {
    const packageInfo: PackageInfo = {
      name: 'astro-simple-fixture',
      scripts: {
        dev: 'astro dev',
      },
      dependencies: {
        astro: '^4.0.0',
      },
      devDependencies: {},
    };

    const framework = detectFramework(packageInfo);

    expect(framework.type).toBe('unknown');
    expect(framework.confidence).toBe('low');
  });

  it('should return unknown for Astro ambiguous fixture', () => {
    const packageInfo: PackageInfo = {
      name: 'astro-ambiguous-fixture',
      scripts: {
        dev: 'astro dev',
      },
      dependencies: {
        astro: '^4.0.0',
      },
      devDependencies: {},
    };

    const framework = detectFramework(packageInfo, fixturePath('astro-ambig'));

    expect(framework.type).toBe('unknown');
    expect(framework.confidence).toBe('low');
  });

  it('should detect NestJS with required config file', () => {
    const packageInfo: PackageInfo = {
      name: 'nest-simple-fixture',
      scripts: {
        start: 'nest start',
      },
      dependencies: {
        '@nestjs/core': '^10.0.0',
        '@nestjs/common': '^10.0.0',
        '@nestjs/cli': '^10.0.0',
      },
      devDependencies: {},
    };

    const framework = detectFramework(packageInfo, fixturePath('nest-simple'));

    expect(framework.type).toBe('nestjs');
    expect(framework.confidence).toBe('high');
  });

  it('should return unknown for nest ambiguous fixture without nest-cli.json', () => {
    const packageInfo: PackageInfo = {
      name: 'nest-ambiguous-fixture',
      scripts: {
        start: 'nest start',
      },
      dependencies: {
        '@nestjs/core': '^10.0.0',
        '@nestjs/common': '^10.0.0',
        '@nestjs/cli': '^10.0.0',
      },
      devDependencies: {},
    };

    const framework = detectFramework(packageInfo, fixturePath('nest-ambig'));

    expect(framework.type).toBe('unknown');
    expect(framework.confidence).toBe('low');
  });

  it('should return unknown for sveltekit in package-only mode without rootPath', () => {
    const packageInfo: PackageInfo = {
      name: 'sveltekit-package-only',
      scripts: {
        dev: 'svelte-kit dev',
      },
      dependencies: {
        '@sveltejs/kit': '^2.0.0',
        svelte: '^5.0.0',
      },
      devDependencies: {},
    };

    const framework = detectFramework(packageInfo);

    expect(framework.type).toBe('unknown');
    expect(framework.confidence).toBe('low');
  });

  it('should return unknown for nestjs in package-only mode without rootPath', () => {
    const packageInfo: PackageInfo = {
      name: 'nestjs-package-only',
      scripts: {
        start: 'nest start',
      },
      dependencies: {
        '@nestjs/core': '^10.0.0',
        '@nestjs/common': '^10.0.0',
        '@nestjs/cli': '^10.0.0',
      },
      devDependencies: {},
    };

    const framework = detectFramework(packageInfo);

    expect(framework.type).toBe('unknown');
    expect(framework.confidence).toBe('low');
  });

  it('should detect Firebase Functions from devDependencies', () => {
    const packageInfo: PackageInfo = {
      name: 'test',
      scripts: {},
      dependencies: {},
      devDependencies: {
        'firebase-functions': '^4.5.0',
      },
    };

    const framework = detectFramework(packageInfo);

    expect(framework.type).toBe('firebase-functions');
    expect(framework.confidence).toBe('medium');
    expect(framework.version).toBe('^4.5.0');
  });

  it('should detect Express with medium confidence', () => {
    const packageInfo: PackageInfo = {
      name: 'test',
      scripts: {},
      dependencies: {
        express: '^4.19.0',
      },
      devDependencies: {},
    };

    const framework = detectFramework(packageInfo);

    expect(framework.type).toBe('express');
    expect(framework.confidence).toBe('medium');
    expect(framework.version).toBe('^4.19.0');
  });

  it('should detect Fastify with medium confidence', () => {
    const packageInfo: PackageInfo = {
      name: 'test',
      scripts: {},
      dependencies: {
        fastify: '^5.0.0',
      },
      devDependencies: {},
    };

    const framework = detectFramework(packageInfo);

    expect(framework.type).toBe('fastify');
    expect(framework.confidence).toBe('medium');
    expect(framework.version).toBe('^5.0.0');
  });

  it('should prioritize Express over Fastify when both are present', () => {
    const packageInfo: PackageInfo = {
      name: 'test',
      scripts: {},
      dependencies: {
        express: '^4.19.0',
        fastify: '^5.0.0',
      },
      devDependencies: {},
    };

    const framework = detectFramework(packageInfo);

    expect(framework.type).toBe('express');
    expect(framework.confidence).toBe('medium');
  });

  it('should apply precedence nuxt > vue when scores are tied', () => {
    const packageInfo: PackageInfo = {
      name: 'test',
      scripts: {},
      dependencies: {
        nuxt: '^3.12.0',
        vue: '^3.4.0',
      },
      devDependencies: {},
    };

    const framework = detectFramework(packageInfo);

    expect(framework.type).toBe('nuxt');
    expect(framework.confidence).toBe('medium');
    expect(framework.version).toBe('^3.12.0');
  });

  it('should keep vue as winner in synthetic near-tie with higher score', () => {
    const packageInfo: PackageInfo = {
      name: 'synthetic-near-tie-nuxt-vue',
      scripts: {},
      dependencies: {
        nuxt: '^3.12.0',
        vue: '^3.4.0',
        '@vue/cli-service': '^5.0.8',
      },
      devDependencies: {},
    };

    const framework = detectFramework(packageInfo);

    expect(framework.type).toBe('vue');
    expect(framework.confidence).toBe('high');
  });

  it('should return unknown for unresolved tie without precedence rule', () => {
    const packageInfo: PackageInfo = {
      name: 'test',
      scripts: {},
      dependencies: {
        express: '^4.19.0',
        vue: '^3.4.0',
      },
      devDependencies: {},
    };

    const framework = detectFramework(packageInfo);

    expect(framework.type).toBe('unknown');
    expect(framework.confidence).toBe('low');
  });

  it('should return unknown for no recognized framework', () => {
    const packageInfo: PackageInfo = {
      name: 'test',
      scripts: {},
      dependencies: {
        lodash: '^4.17.0',
      },
      devDependencies: {},
    };

    const framework = detectFramework(packageInfo);

    expect(framework.type).toBe('unknown');
    expect(framework.confidence).toBe('low');
  });

  it('should handle missing dependency maps defensively', () => {
    const packageInfo = {
      name: 'test',
      scripts: {},
    } as PackageInfo;

    const framework = detectFramework(packageInfo);

    expect(framework.type).toBe('unknown');
    expect(framework.confidence).toBe('low');
  });

  it('characterizes vue dependency-only fixture as current legacy behavior', () => {
    const framework = detectFramework(
      fixturePackageInfo('vue-library-like'),
      fixturePath('vue-library-like')
    );

    expect(framework.type).toBe('vue');
    expect(framework.confidence).toBe('medium');
  });

  it('characterizes express dependency-only fixture as current legacy behavior', () => {
    const framework = detectFramework(
      fixturePackageInfo('express-library-like'),
      fixturePath('express-library-like')
    );

    expect(framework.type).toBe('express');
    expect(framework.confidence).toBe('medium');
  });

  it('characterizes fastify dependency-only fixture as current legacy behavior', () => {
    const framework = detectFramework(
      fixturePackageInfo('fastify-library-like'),
      fixturePath('fastify-library-like')
    );

    expect(framework.type).toBe('fastify');
    expect(framework.confidence).toBe('medium');
  });

  it('documents current behavior for redwood-like fixture without redwood support', () => {
    const framework = detectFramework(
      fixturePackageInfo('redwood-viability-simple'),
      fixturePath('redwood-viability-simple')
    );

    expect(framework.type).toBe('unknown');
    expect(framework.confidence).toBe('low');
  });
});

describe('detectBuildTools', () => {
  it('should return empty list when devDependencies are missing', () => {
    const packageInfo = {
      name: 'test',
      scripts: {},
      dependencies: {},
    } as PackageInfo;

    expect(detectBuildTools(packageInfo)).toEqual([]);
  });

  it('should detect all supported build tools in stable order', () => {
    const packageInfo: PackageInfo = {
      name: 'test',
      scripts: {},
      dependencies: {},
      devDependencies: {
        vite: '^5.0.0',
        webpack: '^5.0.0',
        turbo: '^2.0.0',
        nx: '^19.0.0',
        rollup: '^4.0.0',
        esbuild: '^0.21.0',
        parcel: '^2.0.0',
      },
    };

    expect(detectBuildTools(packageInfo)).toEqual([
      'Vite',
      'Webpack',
      'Turbo',
      'Nx',
      'Rollup',
      'esbuild',
      'Parcel',
    ]);
  });

  it('should keep stable order for sparse tool subsets', () => {
    const packageInfo: PackageInfo = {
      name: 'test',
      scripts: {},
      dependencies: {},
      devDependencies: {
        nx: '^19.0.0',
        vite: '^5.0.0',
        parcel: '^2.0.0',
      },
    };

    expect(detectBuildTools(packageInfo)).toEqual(['Vite', 'Nx', 'Parcel']);
  });
});
