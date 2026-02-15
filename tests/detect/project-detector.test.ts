import fs from 'fs';
import os from 'os';
import { afterEach, describe, expect, it } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import { detectProject } from '../../src/detect/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const fixturesDir = path.join(repoRoot, 'tests', 'fixtures');
const tempDirs: string[] = [];

function createTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-md-project-detector-'));
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

describe('detectProject', () => {
  it('detects monorepo from workspaces array', async () => {
    const projectPath = path.join(fixturesDir, 'monorepo-turbo');
    const result = await detectProject(projectPath);

    expect(result.folderStructure.isMonorepo).toBe(true);
  });

  it('detects monorepo from workspaces object', async () => {
    const projectPath = path.join(fixturesDir, 'monorepo-workspaces-object');
    const result = await detectProject(projectPath);

    expect(result.folderStructure.isMonorepo).toBe(true);
  });

  it('detects monorepo from nx markers and dependency', async () => {
    const projectPath = path.join(fixturesDir, 'monorepo-nx');
    const result = await detectProject(projectPath);

    expect(result.folderStructure.isMonorepo).toBe(true);
  });

  it('detects monorepo from pnpm-workspace marker', async () => {
    const projectPath = path.join(fixturesDir, 'monorepo-pnpm-workspace');
    const result = await detectProject(projectPath);

    expect(result.folderStructure.isMonorepo).toBe(true);
  });

  it('does not mark regular projects as monorepo', async () => {
    const projectPath = path.join(fixturesDir, 'react-vite');
    const result = await detectProject(projectPath);

    expect(result.folderStructure.isMonorepo).toBe(false);
  });

  it('does not mark projects as monorepo with turbo/nx dependencies alone', async () => {
    const projectPath = path.join(fixturesDir, 'tool-only-turbo-nx');
    const result = await detectProject(projectPath);

    expect(result.folderStructure.isMonorepo).toBe(false);
  });

  it('detects nuxt projects without requiring explicit vue dependency', async () => {
    const projectPath = path.join(fixturesDir, 'nuxt-only');
    const result = await detectProject(projectPath);

    expect(result.framework.type).toBe('nuxt');
    expect(result.framework.confidence).toBe('high');
  });

  it('downgrades firebase framework when functions folder is missing', async () => {
    const projectPath = path.join(fixturesDir, 'node-firebase');
    const result = await detectProject(projectPath);

    expect(result.folderStructure.hasFunctions).toBe(false);
    expect(result.framework.type).toBe('unknown');
    expect(result.framework.confidence).toBe('low');
    expect(result.framework.indicators).toContain('missing functions/ directory');
  });

  it('detects firebase framework when dependency and functions folder both exist', async () => {
    const projectPath = path.join(fixturesDir, 'firebase-with-functions');
    const result = await detectProject(projectPath);

    expect(result.folderStructure.hasFunctions).toBe(true);
    expect(result.framework.type).toBe('firebase-functions');
    expect(result.framework.confidence).toBe('high');
  });

  it('detects express over fastify in ambiguous backend fixture', async () => {
    const projectPath = path.join(fixturesDir, 'ambiguous-express-fastify');
    const result = await detectProject(projectPath);

    expect(result.framework.type).toBe('express');
    expect(result.framework.confidence).toBe('medium');
  });

  it('detects react framework even when scripts are empty', async () => {
    const projectPath = path.join(fixturesDir, 'react-no-scripts');
    const result = await detectProject(projectPath);

    expect(result.framework.type).toBe('react');
    expect(result.commands.install).toBe('npm install');
    expect(result.commands.dev).toBeNull();
    expect(result.commands.build).toBeNull();
    expect(result.commands.test).toBeNull();
    expect(result.commands.lint).toBeNull();
    expect(result.commands.format).toBeNull();
  });

  it('detects monorepo from turbo dependency plus packages folder hint', async () => {
    const projectPath = path.join(fixturesDir, 'monorepo-packages-only-turbo');
    const result = await detectProject(projectPath);

    expect(result.folderStructure.hasPackages).toBe(true);
    expect(result.folderStructure.isMonorepo).toBe(true);
  });

  it('returns high confidence when high framework signal has description and >=2 folders', async () => {
    const projectPath = createTempDir();
    fs.mkdirSync(path.join(projectPath, 'src'), { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'tests'), { recursive: true });
    fs.writeFileSync(
      path.join(projectPath, 'package.json'),
      JSON.stringify(
        {
          name: 'tmp-high-confidence',
          description: 'Temp fixture to hit high confidence branch',
          scripts: {},
          dependencies: {
            react: '^18.3.0',
            'react-dom': '^18.3.0',
          },
        },
        null,
        2
      ),
      'utf-8'
    );

    const result = await detectProject(projectPath);

    expect(result.framework.type).toBe('react');
    expect(result.framework.confidence).toBe('high');
    expect(result.folderStructure.folders.length).toBeGreaterThanOrEqual(2);
    expect(Boolean(result.packageInfo?.description)).toBe(true);
    expect(result.confidence).toBe('high');
  });
});
