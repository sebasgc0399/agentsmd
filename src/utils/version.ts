/**
 * Version utilities
 * Single source of truth: root package.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const FALLBACK_VERSION = '0.0.0';
let cachedVersion: string | null = null;

export function getPackageVersion(): string {
  if (cachedVersion) {
    return cachedVersion;
  }

  cachedVersion = readPackageVersion();
  return cachedVersion;
}

function readPackageVersion(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const packageJsonPath = path.resolve(__dirname, '..', '..', 'package.json');

  try {
    const raw = fs.readFileSync(packageJsonPath, 'utf-8');
    const parsed = JSON.parse(raw) as { version?: unknown };

    if (typeof parsed.version === 'string' && parsed.version.trim().length > 0) {
      return parsed.version.trim();
    }
  } catch {
    // Keep fallback for environments where package.json cannot be resolved.
  }

  return FALLBACK_VERSION;
}
