import { describe, it, expect } from 'vitest';
import { detectFramework, detectBuildTools } from '../../src/detect/framework-detector.js';
import { PackageInfo } from '../../src/types.js';

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

  it('should detect Next.js over React', () => {
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

    const framework = detectFramework(packageInfo);

    expect(framework.type).toBe('next');
    expect(framework.confidence).toBe('high');
  });

  it('should detect Firebase Functions', () => {
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
    expect(framework.confidence).toBe('high');
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
    expect(framework.confidence).toBe('high');
    expect(framework.version).toBe('^3.12.0');
  });

  it('should detect Angular with high confidence', () => {
    const packageInfo: PackageInfo = {
      name: 'test',
      scripts: {},
      dependencies: {
        '@angular/core': '^17.0.0',
      },
      devDependencies: {},
    };

    const framework = detectFramework(packageInfo);

    expect(framework.type).toBe('angular');
    expect(framework.confidence).toBe('high');
    expect(framework.version).toBe('^17.0.0');
  });

  it('should detect Svelte from devDependencies', () => {
    const packageInfo: PackageInfo = {
      name: 'test',
      scripts: {},
      dependencies: {},
      devDependencies: {
        svelte: '^5.0.0',
      },
    };

    const framework = detectFramework(packageInfo);

    expect(framework.type).toBe('svelte');
    expect(framework.confidence).toBe('high');
    expect(framework.version).toBe('^5.0.0');
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
    expect(framework.confidence).toBe('high');
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

  it('should prioritize Nuxt over Vue when both are present', () => {
    const packageInfo: PackageInfo = {
      name: 'test',
      scripts: {},
      dependencies: {
        vue: '^3.4.0',
      },
      devDependencies: {
        nuxt: '^3.12.0',
      },
    };

    const framework = detectFramework(packageInfo);

    expect(framework.type).toBe('nuxt');
    expect(framework.confidence).toBe('high');
    expect(framework.version).toBe('^3.12.0');
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
