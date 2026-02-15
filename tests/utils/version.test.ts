import fs from 'fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('getPackageVersion', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('falls back to 0.0.0 when package.json cannot be read', async () => {
    vi.resetModules();
    vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
      throw new Error('read fail');
    });

    const { getPackageVersion } = await import('../../src/utils/version.js');
    const version = getPackageVersion();

    expect(version).toBe('0.0.0');
  });
});
