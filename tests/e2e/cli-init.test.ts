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

function normalizeVersionPrefix(version: string): string {
  return version.trim().replace(/^v/, '');
}

describe('CLI init --dry-run', () => {
  afterEach(() => {
    cleanupTempDirs();
  });

  it('prints root help with init command', () => {
    const cliPath = path.join(repoRoot, 'dist', 'cli.js');

    const result = spawnSync(
      process.execPath,
      [cliPath, '--help'],
      {
        encoding: 'utf-8',
      }
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('init');
  });

  it('prints init help with stable flags', () => {
    const cliPath = path.join(repoRoot, 'dist', 'cli.js');

    const result = spawnSync(
      process.execPath,
      [cliPath, 'init', '--help'],
      {
        encoding: 'utf-8',
      }
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('--dry-run');
    expect(result.stdout).toContain('--profile');
    expect(result.stdout).toContain('--force');
    expect(result.stdout).toContain('--out');
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

  it('does not print length warnings for unknown fixture on standard/full profiles', () => {
    const cliPath = path.join(repoRoot, 'dist', 'cli.js');
    const fixturePath = path.join(repoRoot, 'tests', 'fixtures', 'runtime-npm');

    for (const profile of ['standard', 'full']) {
      const result = spawnSync(
        process.execPath,
        [cliPath, 'init', fixturePath, '--dry-run', '--profile', profile],
        {
          encoding: 'utf-8',
        }
      );

      expect(result.status).toBe(0);
      expect(result.stderr).not.toContain('Output is quite short');
      expect(result.stderr).not.toContain('Output is too long');
    }
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

  it('blocks absolute output path outside project directory in dry-run', () => {
    const cliPath = path.join(repoRoot, 'dist', 'cli.js');
    const fixturePath = path.join(repoRoot, 'tests', 'fixtures', 'react-vite');
    const outsidePath = path.resolve(fixturePath, '..', '..', 'AGENTS.md');

    const result = spawnSync(
      process.execPath,
      [cliPath, 'init', fixturePath, '--dry-run', '--out', outsidePath],
      {
        encoding: 'utf-8',
      }
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Output path must be within the project directory');
  });

  it('fails when project directory does not exist', () => {
    const cliPath = path.join(repoRoot, 'dist', 'cli.js');
    const missingPath = path.join(repoRoot, 'tests', 'fixtures', 'missing-fixture-does-not-exist');

    const result = spawnSync(
      process.execPath,
      [cliPath, 'init', missingPath, '--dry-run'],
      {
        encoding: 'utf-8',
      }
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Directory not found:');
  });

  it('fails with invalid profile in dry-run mode', () => {
    const cliPath = path.join(repoRoot, 'dist', 'cli.js');
    const fixturePath = path.join(repoRoot, 'tests', 'fixtures', 'react-vite');

    const result = spawnSync(
      process.execPath,
      [cliPath, 'init', fixturePath, '--dry-run', '--profile', 'invalid'],
      {
        encoding: 'utf-8',
      }
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Invalid profile');
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

  it('does not overwrite existing AGENTS.md in dry-run without --force', () => {
    const cliPath = path.join(repoRoot, 'dist', 'cli.js');
    const fixturePath = createTempFixtureProject();
    const outputPath = path.join(fixturePath, 'AGENTS.md');
    const sentinel = 'existing content';
    fs.writeFileSync(outputPath, sentinel, 'utf-8');

    const result = spawnSync(
      process.execPath,
      [cliPath, 'init', fixturePath, '--dry-run'],
      {
        encoding: 'utf-8',
      }
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('--- Preview (--dry-run mode) ---');
    expect(fs.readFileSync(outputPath, 'utf-8')).toBe(sentinel);
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

  it('prints the package.json version for --version', () => {
    const cliPath = path.join(repoRoot, 'dist', 'cli.js');
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf-8')
    ) as { version: string };

    const result = spawnSync(
      process.execPath,
      [cliPath, '--version'],
      {
        encoding: 'utf-8',
      }
    );

    const stdoutVersion = result.stdout.trim();
    expect(result.status).toBe(0);
    expect(stdoutVersion).toMatch(/^v?\d+\.\d+\.\d+/);
    expect(normalizeVersionPrefix(stdoutVersion)).toBe(packageJson.version);
  });
});
