import { describe, expect, it } from 'vitest';
import { renderTemplate } from '../../src/render/mustache-renderer.js';
import { TemplateContext } from '../../src/types.js';

describe('renderTemplate', () => {
  it('fails fast when template file is missing', () => {
    const ctx = {} as TemplateContext;

    expect(() => renderTemplate('__missing_template__.mustache', ctx)).toThrow(
      /Template not found: __missing_template__\.mustache/
    );
  });
});
