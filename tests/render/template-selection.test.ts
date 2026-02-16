import { describe, expect, it } from 'vitest';
import { selectTemplate } from '../../src/render/mustache-renderer.js';
import { TemplateContext } from '../../src/types.js';

function createContext(
  frameworkType: string,
  overrides: Partial<TemplateContext> = {}
): TemplateContext {
  return {
    project_name: 'demo',
    project_description: 'demo',
    generator_version: '0.0.0',
    profile: 'compact',
    stacks: [],
    commands: {
      install: 'npm install',
      dev: 'npm run dev',
      build: 'npm run build',
      test: 'npm test',
      lint: 'npm run lint',
      format: 'npm run format',
    },
    style_notes: '',
    testing_notes: '',
    security_notes: '',
    has_dev: true,
    has_tests: true,
    has_lint: true,
    has_format: true,
    has_build: true,
    is_monorepo: false,
    isCompact: true,
    isStandard: false,
    isFull: false,
    isStandardOrFull: false,
    is_unknown_generic: false,
    framework_type: frameworkType,
    runtime_type: 'node',
    ...overrides,
  };
}

describe('selectTemplate', () => {
  it('uses base template for frameworks without dedicated template', () => {
    const frameworkTypes = ['sveltekit', 'astro', 'nestjs', 'svelte', 'express', 'fastify'];

    for (const frameworkType of frameworkTypes) {
      const template = selectTemplate(createContext(frameworkType));
      expect(template).toBe('base.mustache');
    }
  });

  it('keeps existing template behavior for react and firebase', () => {
    expect(selectTemplate(createContext('react'))).toBe('react.mustache');
    expect(selectTemplate(createContext('next'))).toBe('react.mustache');
    expect(selectTemplate(createContext('firebase-functions'))).toBe('firebase.mustache');
  });

  it('selects vue template for vue and nuxt frameworks', () => {
    expect(selectTemplate(createContext('vue'))).toBe('vue.mustache');
    expect(selectTemplate(createContext('nuxt'))).toBe('vue.mustache');
  });

  it('selects angular template for angular framework', () => {
    expect(selectTemplate(createContext('angular'))).toBe('angular.mustache');
  });

  it('keeps monorepo template priority over framework', () => {
    const template = selectTemplate(
      createContext('react', {
        is_monorepo: true,
      })
    );
    expect(template).toBe('monorepo.mustache');
  });
});
