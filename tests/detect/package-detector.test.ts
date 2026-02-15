import fs from 'fs';
import os from 'os';
import { afterEach, describe, it, expect } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import { detectPackageInfo } from '../../src/detect/package-detector.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const fixturesDir = path.join(repoRoot, 'tests', 'fixtures');
const tempDirs: string[] = [];

function createTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-md-package-detector-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('detectPackageInfo', () => {
  it('should detect React + Vite project', async () => {
    const reactPath = path.join(fixturesDir, 'react-vite');
    const info = await detectPackageInfo(reactPath);

    expect(info.name).toBe('my-react-app');
    expect(info.type).toBe('module');
    expect(info.scripts.dev).toBe('vite');
    expect(info.dependencies.react).toBeDefined();
    expect(info.dependencies['react-dom']).toBeDefined();
    expect(info.devDependencies.vite).toBeDefined();
  });

  it('should detect Firebase Functions project', async () => {
    const firebasePath = path.join(fixturesDir, 'node-firebase');
    const info = await detectPackageInfo(firebasePath);

    expect(info.name).toBe('my-firebase-functions');
    expect(info.scripts.serve).toBeDefined();
    expect(info.scripts.deploy).toBeDefined();
    expect(info.dependencies['firebase-functions']).toBeDefined();
    expect(info.dependencies['firebase-admin']).toBeDefined();
  });

  it('should detect monorepo project', async () => {
    const monorepoPath = path.join(fixturesDir, 'monorepo-turbo');
    const info = await detectPackageInfo(monorepoPath);

    expect(info.name).toBe('my-monorepo');
    expect(info.workspaces).toBeDefined();
    expect(info.workspaces).toContain('apps/*');
    expect(info.workspaces).toContain('packages/*');
    expect(info.devDependencies.turbo).toBeDefined();
  });

  it('should normalize workspaces object format', async () => {
    const monorepoPath = path.join(fixturesDir, 'monorepo-workspaces-object');
    const info = await detectPackageInfo(monorepoPath);

    expect(Array.isArray(info.workspaces)).toBe(false);
    expect(info.workspaces).toEqual({
      packages: ['apps/*', 'packages/*'],
    });
  });

  it('should normalize invalid workspaces object to undefined', async () => {
    const projectPath = createTempDir();
    fs.writeFileSync(
      path.join(projectPath, 'package.json'),
      JSON.stringify(
        {
          name: 'invalid-workspaces',
          scripts: {},
          dependencies: {},
          devDependencies: {},
          workspaces: {
            packages: 'apps/*',
          },
        },
        null,
        2
      ),
      'utf-8'
    );

    const info = await detectPackageInfo(projectPath);

    expect(info.workspaces).toBeUndefined();
  });

  it('should throw error when package.json not found', async () => {
    const invalidPath = path.join(fixturesDir, 'non-existent');
    await expect(detectPackageInfo(invalidPath)).rejects.toThrow('No package.json found');
  });
});
