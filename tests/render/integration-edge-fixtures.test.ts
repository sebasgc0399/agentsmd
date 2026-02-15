import { describe, expect, it } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import { detectProject } from '../../src/detect/index.js';
import { renderAgentsMd } from '../../src/render/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

function fixturePath(name: string): string {
  return path.join(repoRoot, 'tests', 'fixtures', name);
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function assertStableOutputInvariants(content: string): void {
  const normalized = normalizeText(content);
  expect(normalized).toContain('# agents');
  expect(normalized).toContain('## comandos canonicos');
  expect(content).not.toMatch(/\bundefined\b/i);
  expect(content).not.toMatch(/\bnull\b/i);
  expect(content).not.toContain('{{');
}

describe('integration edge fixtures detect->render->validate', () => {
  it('ambiguous-express-fastify renders stable backend output', async () => {
    const detection = await detectProject(fixturePath('ambiguous-express-fastify'));
    const result = renderAgentsMd(detection, 'compact');

    expect(detection.framework.type).toBe('express');
    expect(result.validation.valid).toBe(true);
    expect(result.validation.errors).toEqual([]);
    assertStableOutputInvariants(result.content);
  });

  it('react-no-scripts renders without blocking placeholders', async () => {
    const detection = await detectProject(fixturePath('react-no-scripts'));
    const result = renderAgentsMd(detection, 'compact');

    expect(detection.framework.type).toBe('react');
    expect(result.validation.valid).toBe(true);
    expect(result.validation.errors).toEqual([]);
    assertStableOutputInvariants(result.content);
  });

  it('monorepo-packages-only-turbo uses monorepo structure', async () => {
    const detection = await detectProject(fixturePath('monorepo-packages-only-turbo'));
    const result = renderAgentsMd(detection, 'compact');

    expect(detection.folderStructure.isMonorepo).toBe(true);
    expect(normalizeText(result.content)).toContain('## estructura del monorepo');
    expect(result.validation.valid).toBe(true);
    expect(result.validation.errors).toEqual([]);
    assertStableOutputInvariants(result.content);
  });
});
