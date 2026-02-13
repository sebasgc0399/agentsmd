import { afterEach, describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const tempDirs: string[] = [];

function createTempFixtureProject(): string {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-md-cli-e2e-'));
  tempDirs.push(tempRoot);

  const sourceFixture = path.join(repoRoot, 'tests', 'fixtures', 'react-vite');
  const packageJson = fs.readFileSync(path.join(sourceFixture, 'package.json'), 'utf-8');
  fs.writeFileSync(path.join(tempRoot, 'package.json'), packageJson, 'utf-8');

  return tempRoot;
}

function extractPreview(output: string): string {
  const match = output.match(
    /--- Preview \(\-\-dry-run mode\) ---\r?\n([\s\S]*?)\r?\n--- End of preview ---/
  );
  if (!match) {
    throw new Error('Dry-run preview markers not found in CLI output');
  }
  return match[1];
}

function cleanupTempDirs(): void {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
}

describe('CLI init --dry-run', () => {
  afterEach(() => {
    cleanupTempDirs();
  });

  it('renders AGENTS.md for the react-vite fixture', () => {
    const cliPath = path.join(repoRoot, 'dist', 'cli.js');
    const fixturePath = path.join(repoRoot, 'tests', 'fixtures', 'react-vite');

    const result = spawnSync(
      process.execPath,
      [cliPath, 'init', fixturePath, '--dry-run'],
      {
        encoding: 'utf-8',
      }
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('# AGENTS');
    expect(result.stdout).toContain('Comandos');
    expect(result.stdout).toContain('npm run dev');
  });

  it('accepts -y and -i flags without changing default dry-run behavior', () => {
    const cliPath = path.join(repoRoot, 'dist', 'cli.js');
    const fixturePath = path.join(repoRoot, 'tests', 'fixtures', 'react-vite');

    const result = spawnSync(
      process.execPath,
      [cliPath, 'init', fixturePath, '--dry-run', '-y', '-i'],
      {
        encoding: 'utf-8',
      }
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('# AGENTS');
    expect(result.stdout).toContain('Comandos');
  });

  it('blocks output paths outside project directory', () => {
    const cliPath = path.join(repoRoot, 'dist', 'cli.js');
    const fixturePath = path.join(repoRoot, 'tests', 'fixtures', 'react-vite');

    const result = spawnSync(
      process.execPath,
      [cliPath, 'init', fixturePath, '--out', '../AGENTS.md'],
      {
        encoding: 'utf-8',
      }
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Output path must be within the project directory');
  });

  it('fails when AGENTS.md exists and --force is not provided', () => {
    const cliPath = path.join(repoRoot, 'dist', 'cli.js');
    const fixturePath = createTempFixtureProject();
    fs.writeFileSync(path.join(fixturePath, 'AGENTS.md'), 'existing file', 'utf-8');

    const result = spawnSync(
      process.execPath,
      [cliPath, 'init', fixturePath],
      {
        encoding: 'utf-8',
      }
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('already exists. Use --force to overwrite.');
  });

  it('overwrites existing AGENTS.md when --force is provided', () => {
    const cliPath = path.join(repoRoot, 'dist', 'cli.js');
    const fixturePath = createTempFixtureProject();
    const outputPath = path.join(fixturePath, 'AGENTS.md');
    fs.writeFileSync(outputPath, 'existing file', 'utf-8');

    const result = spawnSync(
      process.execPath,
      [cliPath, 'init', fixturePath, '--force'],
      {
        encoding: 'utf-8',
      }
    );

    expect(result.status).toBe(0);
    expect(fs.readFileSync(outputPath, 'utf-8')).toContain('# AGENTS.md');
  });

  it('keeps generated dry-run content identical with and without --verbose', () => {
    const cliPath = path.join(repoRoot, 'dist', 'cli.js');
    const fixturePath = path.join(repoRoot, 'tests', 'fixtures', 'react-vite');

    const normalResult = spawnSync(
      process.execPath,
      [cliPath, 'init', fixturePath, '--dry-run'],
      {
        encoding: 'utf-8',
      }
    );
    const verboseResult = spawnSync(
      process.execPath,
      [cliPath, 'init', fixturePath, '--dry-run', '--verbose'],
      {
        encoding: 'utf-8',
      }
    );

    expect(normalResult.status).toBe(0);
    expect(verboseResult.status).toBe(0);
    expect(extractPreview(verboseResult.stdout)).toBe(extractPreview(normalResult.stdout));
  });
});
