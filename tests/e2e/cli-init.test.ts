import { describe, it, expect } from 'vitest';
import path from 'path';
import { spawnSync } from 'child_process';

describe('CLI init --dry-run', () => {
  it('renders AGENTS.md for the react-vite fixture', () => {
    const cliPath = path.join(process.cwd(), 'dist', 'cli.js');
    const fixturePath = path.join(process.cwd(), 'tests', 'fixtures', 'react-vite');

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
});
