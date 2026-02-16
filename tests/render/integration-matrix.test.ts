import { describe, expect, it } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import { detectProject } from '../../src/detect/index.js';
import { renderAgentsMd } from '../../src/render/index.js';
import { FrameworkType, Profile } from '../../src/types.js';

type MatrixCase = {
  fixture: string;
  expectedFramework: FrameworkType;
  expectedMonorepo: boolean;
  requiredSpecificSections: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const profiles: Profile[] = ['compact', 'standard', 'full'];

const matrix: MatrixCase[] = [
  {
    fixture: 'react-vite',
    expectedFramework: 'react',
    expectedMonorepo: false,
    requiredSpecificSections: ['## testing guidelines'],
  },
  {
    fixture: 'runtime-npm',
    expectedFramework: 'unknown',
    expectedMonorepo: false,
    requiredSpecificSections: [],
  },
  {
    fixture: 'monorepo-turbo',
    expectedFramework: 'unknown',
    expectedMonorepo: true,
    requiredSpecificSections: ['## estructura del monorepo', '## build y deploy'],
  },
  {
    fixture: 'firebase-with-functions',
    expectedFramework: 'firebase-functions',
    expectedMonorepo: false,
    requiredSpecificSections: ['## environment variables', '## deployment'],
  },
  {
    fixture: 'vue-vite',
    expectedFramework: 'vue',
    expectedMonorepo: false,
    requiredSpecificSections: ['## testing guidelines'],
  },
];

function fixturePath(name: string): string {
  return path.join(repoRoot, 'tests', 'fixtures', name);
}

async function runPipeline(fixture: string, profile: Profile) {
  const detection = await detectProject(fixturePath(fixture));
  const result = renderAgentsMd(detection, profile);
  return {
    detection,
    result,
  };
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function assertRequiredSections(content: string): void {
  const normalized = normalizeText(content);
  expect(normalized).toContain('# agents');
  expect(normalized).toContain('## comandos canonicos');
  expect(normalized).toContain('## definition of done');
}

function assertNoBlockingPlaceholders(content: string): void {
  expect(content).not.toMatch(/\bundefined\b/i);
  expect(content).not.toMatch(/\bnull\b/i);
  expect(content).not.toContain('{{');
}

describe('integration matrix detect->render->validate', () => {
  for (const matrixCase of matrix) {
    it(`validates ${matrixCase.fixture} across compact/standard/full`, async () => {
      const lineCounts: Record<Profile, number> = {
        compact: 0,
        standard: 0,
        full: 0,
      };

      for (const profile of profiles) {
        const run1 = await runPipeline(matrixCase.fixture, profile);
        const run2 = await runPipeline(matrixCase.fixture, profile);

        // Strong determinism: same rendered content and same validation result.
        expect(run2.result.content).toBe(run1.result.content);
        expect(run2.result.validation).toEqual(run1.result.validation);

        // Detection stability on key functional fields.
        expect(run2.detection.framework).toEqual(run1.detection.framework);
        expect(run2.detection.runtime).toEqual(run1.detection.runtime);
        expect(run2.detection.commands).toEqual(run1.detection.commands);
        expect(run2.detection.confidence).toBe(run1.detection.confidence);
        expect(run2.detection.folderStructure.isMonorepo).toBe(
          run1.detection.folderStructure.isMonorepo
        );

        expect(run1.detection.framework.type).toBe(matrixCase.expectedFramework);
        expect(run1.detection.folderStructure.isMonorepo).toBe(matrixCase.expectedMonorepo);
        expect(run1.result.validation.valid).toBe(true);
        expect(run1.result.validation.errors).toEqual([]);

        assertRequiredSections(run1.result.content);
        assertNoBlockingPlaceholders(run1.result.content);

        const h2Count = (run1.result.content.match(/^##\s+/gm) || []).length;
        expect(h2Count).toBeGreaterThan(0);

        const normalizedContent = normalizeText(run1.result.content);
        for (const section of matrixCase.requiredSpecificSections) {
          expect(normalizedContent).toContain(section);
        }

        lineCounts[profile] = run1.result.validation.lineCount;
      }

      expect(lineCounts.standard).toBeGreaterThan(lineCounts.compact);
      expect(lineCounts.full).toBeGreaterThan(lineCounts.standard);
    });
  }
});
