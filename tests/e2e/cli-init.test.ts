import { describe, it, expect } from 'vitest';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

describe('CLI init --dry-run', () => {
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
});
