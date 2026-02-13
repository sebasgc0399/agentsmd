import { describe, it, expect } from 'vitest';
import { detectFramework } from '../../src/detect/framework-detector.js';
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
