/**
 * Mustache template rendering
 */

import Mustache from 'mustache';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TemplateContext } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load template file
 */
function loadTemplate(templateName: string): string {
  const templatePath = path.join(__dirname, '..', 'templates', templateName);

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${templateName}`);
  }

  return fs.readFileSync(templatePath, 'utf-8');
}

/**
 * Render template with context
 */
export function renderTemplate(
  templateName: string,
  context: TemplateContext
): string {
  const template = loadTemplate(templateName);

  // Disable HTML escaping since we're generating Markdown
  Mustache.escape = (text) => text;

  return Mustache.render(template, context);
}

/**
 * Select appropriate template based on framework
 */
export function selectTemplate(context: TemplateContext): string {
  // Monorepo has highest priority
  if (context.is_monorepo) {
    return 'monorepo.mustache';
  }

  // Framework-specific templates
  switch (context.framework_type) {
    case 'react':
    case 'next':
      return 'react.mustache';

    case 'vue':
    case 'nuxt':
      return 'vue.mustache';

    case 'angular':
      return 'angular.mustache';

    case 'firebase-functions':
      return 'firebase.mustache';

    default:
      return 'base.mustache';
  }
}
