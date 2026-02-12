import { describe, it, expect } from 'vitest';
import path from 'path';
import { detectPackageInfo } from '../../src/detect/package-detector.js';

const fixturesDir = path.join(process.cwd(), 'tests', 'fixtures');

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

  it('should throw error when package.json not found', async () => {
    const invalidPath = path.join(fixturesDir, 'non-existent');
    await expect(detectPackageInfo(invalidPath)).rejects.toThrow('No package.json found');
  });
});
