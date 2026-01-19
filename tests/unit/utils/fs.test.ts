/**
 * Tests for file system utilities
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import {
  readFile,
  writeFile,
  pathExists,
  isFile,
  isDirectory,
  ensureDir,
  getExtension,
  getBasename,
  getRelativePath,
  listFiles,
  listDirectories,
  findFiles,
  resolvePath,
  getFileInfo,
} from '../../../src/utils/fs.js';
import { FileNotFoundError } from '../../../src/errors.js';

describe('fs utilities', () => {
  let testDir: string;

  beforeEach(() => {
    // Create a unique test directory
    testDir = join(tmpdir(), `bridge-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('readFile', () => {
    it('should read file contents as string', () => {
      const filePath = join(testDir, 'test.txt');
      writeFileSync(filePath, 'Hello, World!', 'utf-8');

      const content = readFile(filePath);
      expect(content).toBe('Hello, World!');
    });

    it('should read file with UTF-8 encoding', () => {
      const filePath = join(testDir, 'unicode.txt');
      const unicodeContent = '你好世界 🌍 Привет мир';
      writeFileSync(filePath, unicodeContent, 'utf-8');

      const content = readFile(filePath);
      expect(content).toBe(unicodeContent);
    });

    it('should throw FileNotFoundError for non-existent file', () => {
      const filePath = join(testDir, 'nonexistent.txt');

      expect(() => readFile(filePath)).toThrow(FileNotFoundError);
    });

    it('should handle absolute paths', () => {
      const filePath = join(testDir, 'absolute.txt');
      writeFileSync(filePath, 'content', 'utf-8');

      const content = readFile(filePath);
      expect(content).toBe('content');
    });
  });

  describe('writeFile', () => {
    it('should write content to file', () => {
      const filePath = join(testDir, 'output.txt');

      writeFile(filePath, 'Test content');

      expect(readFileSync(filePath, 'utf-8')).toBe('Test content');
    });

    it('should create parent directories if they do not exist', () => {
      const filePath = join(testDir, 'nested', 'deep', 'output.txt');

      writeFile(filePath, 'Nested content');

      expect(existsSync(filePath)).toBe(true);
      expect(readFileSync(filePath, 'utf-8')).toBe('Nested content');
    });

    it('should overwrite existing file', () => {
      const filePath = join(testDir, 'existing.txt');
      writeFileSync(filePath, 'Original', 'utf-8');

      writeFile(filePath, 'Updated');

      expect(readFileSync(filePath, 'utf-8')).toBe('Updated');
    });

    it('should write empty string', () => {
      const filePath = join(testDir, 'empty.txt');

      writeFile(filePath, '');

      expect(readFileSync(filePath, 'utf-8')).toBe('');
    });
  });

  describe('pathExists', () => {
    it('should return true for existing file', () => {
      const filePath = join(testDir, 'exists.txt');
      writeFileSync(filePath, 'content', 'utf-8');

      expect(pathExists(filePath)).toBe(true);
    });

    it('should return true for existing directory', () => {
      const dirPath = join(testDir, 'subdir');
      mkdirSync(dirPath);

      expect(pathExists(dirPath)).toBe(true);
    });

    it('should return false for non-existent path', () => {
      const filePath = join(testDir, 'nonexistent.txt');

      expect(pathExists(filePath)).toBe(false);
    });
  });

  describe('isFile', () => {
    it('should return true for file', () => {
      const filePath = join(testDir, 'file.txt');
      writeFileSync(filePath, 'content', 'utf-8');

      expect(isFile(filePath)).toBe(true);
    });

    it('should return false for directory', () => {
      const dirPath = join(testDir, 'subdir');
      mkdirSync(dirPath);

      expect(isFile(dirPath)).toBe(false);
    });

    it('should return false for non-existent path', () => {
      const filePath = join(testDir, 'nonexistent.txt');

      expect(isFile(filePath)).toBe(false);
    });
  });

  describe('isDirectory', () => {
    it('should return true for directory', () => {
      const dirPath = join(testDir, 'subdir');
      mkdirSync(dirPath);

      expect(isDirectory(dirPath)).toBe(true);
    });

    it('should return false for file', () => {
      const filePath = join(testDir, 'file.txt');
      writeFileSync(filePath, 'content', 'utf-8');

      expect(isDirectory(filePath)).toBe(false);
    });

    it('should return false for non-existent path', () => {
      const dirPath = join(testDir, 'nonexistent');

      expect(isDirectory(dirPath)).toBe(false);
    });
  });

  describe('ensureDir', () => {
    it('should create directory if it does not exist', () => {
      const dirPath = join(testDir, 'newdir');

      ensureDir(dirPath);

      expect(existsSync(dirPath)).toBe(true);
      expect(isDirectory(dirPath)).toBe(true);
    });

    it('should create nested directories', () => {
      const dirPath = join(testDir, 'a', 'b', 'c');

      ensureDir(dirPath);

      expect(existsSync(dirPath)).toBe(true);
    });

    it('should not throw if directory already exists', () => {
      const dirPath = join(testDir, 'existing');
      mkdirSync(dirPath);

      expect(() => ensureDir(dirPath)).not.toThrow();
    });
  });

  describe('getExtension', () => {
    it('should return file extension in lowercase', () => {
      expect(getExtension('file.txt')).toBe('.txt');
      expect(getExtension('file.TXT')).toBe('.txt');
      expect(getExtension('file.TypeScript.ts')).toBe('.ts');
    });

    it('should return empty string for files without extension', () => {
      expect(getExtension('Makefile')).toBe('');
      expect(getExtension('LICENSE')).toBe('');
    });

    it('should handle paths with directories', () => {
      expect(getExtension('/path/to/file.json')).toBe('.json');
      expect(getExtension('src/components/Button.tsx')).toBe('.tsx');
    });

    it('should handle dotfiles', () => {
      expect(getExtension('.gitignore')).toBe('');
      expect(getExtension('.env.local')).toBe('.local');
    });
  });

  describe('getBasename', () => {
    it('should return filename without extension', () => {
      expect(getBasename('file.txt')).toBe('file');
      expect(getBasename('component.test.ts')).toBe('component.test');
    });

    it('should return filename for files without extension', () => {
      expect(getBasename('Makefile')).toBe('Makefile');
      expect(getBasename('LICENSE')).toBe('LICENSE');
    });

    it('should handle paths with directories', () => {
      expect(getBasename('/path/to/file.json')).toBe('file');
      expect(getBasename('src/Button.tsx')).toBe('Button');
    });
  });

  describe('getRelativePath', () => {
    it('should return relative path between files', () => {
      const from = '/project/src/index.ts';
      const to = '/project/src/utils/helper.ts';

      const result = getRelativePath(from, to);
      expect(result).toBe('utils/helper.ts');
    });

    it('should handle parent directories', () => {
      const from = '/project/src/deep/file.ts';
      const to = '/project/lib/utils.ts';

      const result = getRelativePath(from, to);
      expect(result).toBe('../../lib/utils.ts');
    });

    it('should handle same directory', () => {
      const from = '/project/src/a.ts';
      const to = '/project/src/b.ts';

      const result = getRelativePath(from, to);
      expect(result).toBe('b.ts');
    });
  });

  describe('listFiles', () => {
    it('should return list of files in directory', () => {
      writeFileSync(join(testDir, 'a.txt'), 'a', 'utf-8');
      writeFileSync(join(testDir, 'b.txt'), 'b', 'utf-8');
      mkdirSync(join(testDir, 'subdir'));

      const files = listFiles(testDir);

      expect(files).toHaveLength(2);
      expect(files.some((f) => f.endsWith('a.txt'))).toBe(true);
      expect(files.some((f) => f.endsWith('b.txt'))).toBe(true);
    });

    it('should return empty array for non-existent directory', () => {
      const files = listFiles(join(testDir, 'nonexistent'));

      expect(files).toEqual([]);
    });

    it('should not include subdirectories', () => {
      mkdirSync(join(testDir, 'subdir'));
      writeFileSync(join(testDir, 'file.txt'), 'content', 'utf-8');

      const files = listFiles(testDir);

      expect(files).toHaveLength(1);
      expect(files[0]).toContain('file.txt');
    });
  });

  describe('listDirectories', () => {
    it('should return list of directories', () => {
      mkdirSync(join(testDir, 'dir1'));
      mkdirSync(join(testDir, 'dir2'));
      writeFileSync(join(testDir, 'file.txt'), 'content', 'utf-8');

      const dirs = listDirectories(testDir);

      expect(dirs).toHaveLength(2);
      expect(dirs.some((d) => d.endsWith('dir1'))).toBe(true);
      expect(dirs.some((d) => d.endsWith('dir2'))).toBe(true);
    });

    it('should return empty array for non-existent directory', () => {
      const dirs = listDirectories(join(testDir, 'nonexistent'));

      expect(dirs).toEqual([]);
    });

    it('should not include files', () => {
      mkdirSync(join(testDir, 'subdir'));
      writeFileSync(join(testDir, 'file.txt'), 'content', 'utf-8');

      const dirs = listDirectories(testDir);

      expect(dirs).toHaveLength(1);
      expect(dirs[0]).toContain('subdir');
    });
  });

  describe('findFiles', () => {
    it('should find files matching pattern recursively', () => {
      mkdirSync(join(testDir, 'src'));
      mkdirSync(join(testDir, 'src', 'utils'));
      writeFileSync(join(testDir, 'src', 'index.ts'), '', 'utf-8');
      writeFileSync(join(testDir, 'src', 'utils', 'helper.ts'), '', 'utf-8');
      writeFileSync(join(testDir, 'README.md'), '', 'utf-8');

      const files = findFiles(testDir, /\.ts$/);

      expect(files).toHaveLength(2);
      expect(files.some((f) => f.endsWith('index.ts'))).toBe(true);
      expect(files.some((f) => f.endsWith('helper.ts'))).toBe(true);
    });

    it('should return empty array for non-existent directory', () => {
      const files = findFiles(join(testDir, 'nonexistent'), /\.ts$/);

      expect(files).toEqual([]);
    });

    it('should return empty array when no files match', () => {
      writeFileSync(join(testDir, 'file.txt'), '', 'utf-8');

      const files = findFiles(testDir, /\.ts$/);

      expect(files).toEqual([]);
    });

    it('should handle complex patterns', () => {
      writeFileSync(join(testDir, 'component.test.ts'), '', 'utf-8');
      writeFileSync(join(testDir, 'component.ts'), '', 'utf-8');
      writeFileSync(join(testDir, 'helper.test.ts'), '', 'utf-8');

      const files = findFiles(testDir, /\.test\.ts$/);

      expect(files).toHaveLength(2);
    });
  });

  describe('resolvePath', () => {
    it('should resolve path relative to base file', () => {
      const base = '/project/src/index.ts';
      const result = resolvePath(base, './utils/helper.ts');

      expect(result).toBe(resolve('/project/src', './utils/helper.ts'));
    });

    it('should handle parent directory references', () => {
      const base = '/project/src/deep/file.ts';
      const result = resolvePath(base, '../utils.ts');

      expect(result).toBe(resolve('/project/src/deep', '../utils.ts'));
    });

    it('should handle multiple path segments', () => {
      const base = '/project/src/index.ts';
      const result = resolvePath(base, '..', 'lib', 'utils.ts');

      expect(result).toBe(resolve('/project/src', '..', 'lib', 'utils.ts'));
    });
  });

  describe('getFileInfo', () => {
    it('should return complete file information', () => {
      const filePath = join(testDir, 'component.tsx');
      writeFileSync(filePath, '', 'utf-8');

      const info = getFileInfo(filePath);

      expect(info.path).toBe(resolve(filePath));
      expect(info.name).toBe('component.tsx');
      expect(info.extension).toBe('.tsx');
      expect(info.basename).toBe('component');
      expect(info.directory).toBe(resolve(testDir));
    });

    it('should handle files without extension', () => {
      const filePath = join(testDir, 'Makefile');
      writeFileSync(filePath, '', 'utf-8');

      const info = getFileInfo(filePath);

      expect(info.name).toBe('Makefile');
      expect(info.extension).toBe('');
      expect(info.basename).toBe('Makefile');
    });

    it('should handle dotfiles', () => {
      const filePath = join(testDir, '.gitignore');
      writeFileSync(filePath, '', 'utf-8');

      const info = getFileInfo(filePath);

      expect(info.name).toBe('.gitignore');
      expect(info.extension).toBe('');
      expect(info.basename).toBe('.gitignore');
    });
  });
});
