import { describe, expect, it } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import { FrameworkType } from '../../src/types.js';
import { detectProject } from '../../src/detect/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const fixturesDir = path.join(repoRoot, 'tests', 'fixtures');

const EXISTING_FIXTURE_EXPECTATIONS: Record<string, FrameworkType> = {
  'ambiguous-express-fastify': 'express',
  'firebase-with-functions': 'firebase-functions',
  'monorepo-nx': 'unknown',
  'monorepo-packages-only-turbo': 'unknown',
  'monorepo-pnpm-workspace': 'unknown',
  'monorepo-turbo': 'unknown',
  'monorepo-workspaces-object': 'unknown',
  'node-firebase': 'unknown',
  'nuxt-only': 'nuxt',
  'react-no-scripts': 'react',
  'react-vite': 'react',
  'runtime-bun-dep': 'unknown',
  'runtime-bun-lock': 'unknown',
  'runtime-npm': 'unknown',
  'runtime-pnpm': 'unknown',
  'runtime-yarn': 'unknown',
  'tool-only-turbo-nx': 'unknown',
  'vue-vite': 'vue',
};

describe('framework regression for existing fixtures', () => {
  it('keeps framework.type stable for pre-P0 fixtures', async () => {
    const fixtureNames = Object.keys(EXISTING_FIXTURE_EXPECTATIONS).sort();
    const mismatches: string[] = [];

    for (const fixtureName of fixtureNames) {
      const fixturePath = path.join(fixturesDir, fixtureName);
      const expectedType = EXISTING_FIXTURE_EXPECTATIONS[fixtureName];
      const result = await detectProject(fixturePath);

      if (result.framework.type !== expectedType) {
        mismatches.push(
          `${fixtureName}: expected ${expectedType}, got ${result.framework.type}`
        );
      }
    }

    expect(
      mismatches,
      mismatches.length > 0
        ? `Framework regression detected:\n${mismatches.join('\n')}`
        : 'No framework regression'
    ).toEqual([]);
  });
});
