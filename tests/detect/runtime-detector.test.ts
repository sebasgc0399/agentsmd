import { describe, expect, it } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import { detectRuntime } from '../../src/detect/runtime-detector.js';
import { detectPackageInfo } from '../../src/detect/package-detector.js';
import { PackageInfo } from '../../src/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const fixturesDir = path.join(repoRoot, 'tests', 'fixtures');

describe('detectRuntime', () => {
  it('defaults to npm and node when no lockfile exists', async () => {
    const rootPath = path.join(fixturesDir, 'runtime-npm');
    const packageInfo = await detectPackageInfo(rootPath);
    const runtime = detectRuntime(rootPath, packageInfo);

    expect(runtime.type).toBe('node');
    expect(runtime.packageManager).toBe('npm');
    expect(runtime.version).toBe('>=18.0.0');
  });

  it('detects yarn when yarn.lock exists', async () => {
    const rootPath = path.join(fixturesDir, 'runtime-yarn');
    const packageInfo = await detectPackageInfo(rootPath);
    const runtime = detectRuntime(rootPath, packageInfo);

    expect(runtime.type).toBe('node');
    expect(runtime.packageManager).toBe('yarn');
    expect(runtime.version).toBe('20.0.0');
  });

  it('detects pnpm when pnpm-lock.yaml exists', async () => {
    const rootPath = path.join(fixturesDir, 'runtime-pnpm');
    const packageInfo = await detectPackageInfo(rootPath);
    const runtime = detectRuntime(rootPath, packageInfo);

    expect(runtime.type).toBe('node');
    expect(runtime.packageManager).toBe('pnpm');
    expect(runtime.version).toBe('18.17.0');
  });

  it('detects bun from bun.lockb and reports bun engine version', async () => {
    const rootPath = path.join(fixturesDir, 'runtime-bun-lock');
    const packageInfo = await detectPackageInfo(rootPath);
    const runtime = detectRuntime(rootPath, packageInfo);

    expect(runtime.type).toBe('bun');
    expect(runtime.packageManager).toBe('bun');
    expect(runtime.version).toBe('1.1.0');
  });

  it('detects bun runtime when bun dependency exists without bun lockfile', async () => {
    const rootPath = path.join(fixturesDir, 'runtime-bun-dep');
    const packageInfo = await detectPackageInfo(rootPath);
    const runtime = detectRuntime(rootPath, packageInfo);

    expect(runtime.type).toBe('bun');
    expect(runtime.packageManager).toBe('bun');
    expect(runtime.version).toBe('1.1.3');
  });

  it('handles missing dependency maps without throwing', () => {
    const rootPath = path.join(fixturesDir, 'runtime-npm');
    const packageInfo = {
      name: 'partial-runtime-info',
      scripts: {},
      engines: { node: '>=18.0.0' },
    } as unknown as PackageInfo;

    const runtime = detectRuntime(rootPath, packageInfo);

    expect(runtime.type).toBe('node');
    expect(runtime.packageManager).toBe('npm');
    expect(runtime.version).toBe('>=18.0.0');
  });
});
