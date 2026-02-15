import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  directoryExists,
  fileExists,
  isPathSafe,
  readPackageJson,
} from '../../src/utils/fs-utils.js';

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
  vi.restoreAllMocks();
});

describe('readPackageJson', () => {
  it('rejects package.json larger than 1MB', async () => {
    const root = createTempDir();
    const oversizedJson = JSON.stringify({
      name: 'oversized',
      payload: 'x'.repeat(1024 * 1024 + 64),
    });
    fs.writeFileSync(path.join(root, 'package.json'), oversizedJson, 'utf-8');

    await expect(readPackageJson(root)).rejects.toThrow(/package\.json is too large/i);
  });

  it('rejects invalid JSON in package.json', async () => {
    const root = createTempDir();
    fs.writeFileSync(path.join(root, 'package.json'), '{"name":"broken",', 'utf-8');

    await expect(readPackageJson(root)).rejects.toThrow('Invalid JSON in package.json');
  });
});

describe('directoryExists', () => {
  it('returns false when statSync throws only for the target directory path', () => {
    const root = createTempDir();
    const targetDir = path.join(root, 'target-dir');
    fs.mkdirSync(targetDir, { recursive: true });

    const originalStatSync = fs.statSync.bind(fs);
    vi.spyOn(fs, 'statSync').mockImplementation((p: fs.PathLike, options?: fs.StatSyncOptions) => {
      const resolved = path.resolve(String(p));
      if (resolved === path.resolve(targetDir)) {
        throw new Error('forced directory stat failure');
      }
      return originalStatSync(p, options);
    });

    expect(directoryExists(targetDir)).toBe(false);
  });
});

describe('fileExists', () => {
  it('returns false when statSync throws only for the target file path', () => {
    const root = createTempDir();
    const targetFile = path.join(root, 'target-file.txt');
    fs.writeFileSync(targetFile, 'ok', 'utf-8');

    const originalStatSync = fs.statSync.bind(fs);
    vi.spyOn(fs, 'statSync').mockImplementation((p: fs.PathLike, options?: fs.StatSyncOptions) => {
      const resolved = path.resolve(String(p));
      if (resolved === path.resolve(targetFile)) {
        throw new Error('forced file stat failure');
      }
      return originalStatSync(p, options);
    });

    expect(fileExists(targetFile)).toBe(false);
  });
});

describe('isPathSafe', () => {
  it('returns false when base path does not exist', () => {
    const root = path.join(createTempDir(), 'missing-base');
    expect(isPathSafe(root, 'AGENTS.md')).toBe(false);
  });

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

  it('blocks nested traversal attempts', () => {
    const root = createTempDir();
    fs.mkdirSync(path.join(root, 'safe'), { recursive: true });

    expect(isPathSafe(root, path.join('safe', '..', '..', 'outside', 'AGENTS.md'))).toBe(false);
  });

  it('resolves relative target paths against base path regardless of process.cwd', () => {
    const root = createTempDir();
    expect(isPathSafe(root, 'AGENTS.md')).toBe(true);
  });

  it('allows target path equal to base path', () => {
    const root = createTempDir();
    expect(isPathSafe(root, root)).toBe(true);
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

  it('fails closed when symlink metadata cannot be read', () => {
    const root = createTempDir();
    const docsDir = path.join(root, 'docs');
    fs.mkdirSync(docsDir, { recursive: true });

    const originalLstatSync = fs.lstatSync.bind(fs);
    const spy = vi.spyOn(fs, 'lstatSync').mockImplementation((filePath: fs.PathLike) => {
      const normalizedPath = path.resolve(String(filePath));
      if (normalizedPath === path.resolve(docsDir)) {
        throw new Error('metadata read failure');
      }
      return originalLstatSync(filePath);
    });

    try {
      expect(isPathSafe(root, path.join('docs', 'AGENTS.md'))).toBe(false);
    } finally {
      spy.mockRestore();
    }
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
