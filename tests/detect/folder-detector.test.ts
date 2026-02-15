import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { detectFolderStructure } from '../../src/detect/folder-detector.js';
import { PackageInfo } from '../../src/types.js';

const tempDirs: string[] = [];

function createTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-md-folder-detector-'));
  tempDirs.push(dir);
  return dir;
}

function createPackageInfo(
  partial: Partial<PackageInfo> = {}
): PackageInfo {
  return {
    name: 'test-project',
    scripts: {},
    dependencies: {},
    devDependencies: {},
    ...partial,
  };
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('detectFolderStructure', () => {
  it('detects tests folder aliases (tests, test, __tests__)', () => {
    for (const testsDir of ['tests', 'test', '__tests__']) {
      const rootPath = createTempDir();
      fs.mkdirSync(path.join(rootPath, testsDir), { recursive: true });

      const result = detectFolderStructure(rootPath);
      expect(result.hasTests).toBe(true);
      expect(result.folders).toContain('tests');
    }
  });

  it('detects functions folder', () => {
    const rootPath = createTempDir();
    fs.mkdirSync(path.join(rootPath, 'functions'), { recursive: true });

    const result = detectFolderStructure(rootPath);
    expect(result.hasFunctions).toBe(true);
    expect(result.folders).toContain('functions');
  });

  it('detects monorepo from apps and packages folders', () => {
    const rootPath = createTempDir();
    fs.mkdirSync(path.join(rootPath, 'apps'), { recursive: true });
    fs.mkdirSync(path.join(rootPath, 'packages'), { recursive: true });

    const result = detectFolderStructure(rootPath);
    expect(result.isMonorepo).toBe(true);
  });

  it('detects monorepo from workspaces array', () => {
    const rootPath = createTempDir();
    const packageInfo = createPackageInfo({
      workspaces: ['apps/*', 'packages/*'],
    });

    const result = detectFolderStructure(rootPath, packageInfo);
    expect(result.isMonorepo).toBe(true);
  });

  it('detects monorepo from workspaces object format', () => {
    const rootPath = createTempDir();
    const packageInfo = createPackageInfo({
      workspaces: { packages: ['apps/*', 'packages/*'] },
    });

    const result = detectFolderStructure(rootPath, packageInfo);
    expect(result.isMonorepo).toBe(true);
  });

  it('does not detect monorepo from invalid workspaces object shape', () => {
    const rootPath = createTempDir();
    const packageInfo = createPackageInfo({
      workspaces: { packages: 'apps/*' } as unknown as PackageInfo['workspaces'],
    });

    const result = detectFolderStructure(rootPath, packageInfo);
    expect(result.isMonorepo).toBe(false);
  });

  it('detects monorepo from marker files', () => {
    const markerFiles = [
      'pnpm-workspace.yaml',
      'turbo.json',
      'nx.json',
      'lerna.json',
    ];

    for (const marker of markerFiles) {
      const rootPath = createTempDir();
      fs.writeFileSync(path.join(rootPath, marker), '{}', 'utf-8');

      const result = detectFolderStructure(rootPath);
      expect(result.isMonorepo).toBe(true);
    }
  });

  it('does not detect monorepo from turbo/nx dependencies alone', () => {
    const rootPath = createTempDir();
    const packageInfo = createPackageInfo({
      devDependencies: {
        turbo: '^1.11.0',
        nx: '^19.0.0',
      },
    });

    const result = detectFolderStructure(rootPath, packageInfo);
    expect(result.isMonorepo).toBe(false);
  });

  it('detects monorepo when turbo/nx dependencies are paired with folder hints', () => {
    const rootPath = createTempDir();
    fs.mkdirSync(path.join(rootPath, 'apps'), { recursive: true });
    const packageInfo = createPackageInfo({
      devDependencies: {
        turbo: '^1.11.0',
      },
    });

    const result = detectFolderStructure(rootPath, packageInfo);
    expect(result.isMonorepo).toBe(true);
  });
});
