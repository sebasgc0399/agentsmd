import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { isPathSafe } from '../../src/utils/fs-utils.js';

const tempDirs: string[] = [];

function createTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-md-path-safe-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('isPathSafe', () => {
  it('allows output paths inside the project root', () => {
    const root = createTempDir();
    const target = path.join(root, 'docs', 'AGENTS.md');

    expect(isPathSafe(root, target)).toBe(true);
  });

  it('allows child paths that start with ".." but are not traversal segments', () => {
    const root = createTempDir();
    fs.mkdirSync(path.join(root, '..foo'), { recursive: true });

    expect(isPathSafe(root, path.join('..foo', 'AGENTS.md'))).toBe(true);
  });

  it('blocks parent-directory traversal paths', () => {
    const root = createTempDir();
    const target = '../AGENTS.md';

    expect(isPathSafe(root, target)).toBe(false);
  });

  it('resolves relative target paths against base path regardless of process.cwd', () => {
    const root = createTempDir();
    expect(isPathSafe(root, 'AGENTS.md')).toBe(true);
  });

  it('blocks sibling paths that share a misleading prefix', () => {
    const root = createTempDir();
    const sibling = `${root}-other`;
    const target = path.join(sibling, 'AGENTS.md');

    expect(isPathSafe(root, target)).toBe(false);
  });

  it('blocks absolute paths outside of the project root', () => {
    const root = createTempDir();
    const target = path.resolve(root, '..', '..', 'outside', 'AGENTS.md');

    expect(isPathSafe(root, target)).toBe(false);
  });

  it('handles Windows path case-insensitivity safely', () => {
    if (process.platform !== 'win32') {
      expect(true).toBe(true);
      return;
    }

    const root = createTempDir();
    const upperBase = root.toUpperCase();
    const lowerTarget = path.join(root.toLowerCase(), 'docs', 'AGENTS.md');

    expect(isPathSafe(upperBase, lowerTarget)).toBe(true);
  });

  it('allows existing symlink directories that resolve inside the project root', () => {
    const root = createTempDir();
    const realDir = path.join(root, 'docs-real');
    const linkDir = path.join(root, 'docs-link');

    fs.mkdirSync(realDir, { recursive: true });

    if (!createDirectorySymlink(realDir, linkDir)) {
      expect(true).toBe(true);
      return;
    }

    const target = path.join(linkDir, 'AGENTS.md');
    expect(isPathSafe(root, target)).toBe(true);
  });

  it('blocks existing symlink directories that resolve outside the project root', () => {
    const root = createTempDir();
    const external = createTempDir();
    const linkDir = path.join(root, 'linked');

    if (!createDirectorySymlink(external, linkDir)) {
      expect(true).toBe(true);
      return;
    }

    const target = path.join(linkDir, 'AGENTS.md');
    expect(isPathSafe(root, target)).toBe(false);
  });
});

function createDirectorySymlink(target: string, linkPath: string): boolean {
  try {
    fs.symlinkSync(
      path.resolve(target),
      linkPath,
      process.platform === 'win32' ? 'junction' : 'dir'
    );
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'EPERM' || code === 'EACCES' || code === 'UNKNOWN') {
      return false;
    }
    throw error;
  }
}
