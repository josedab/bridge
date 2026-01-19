/**
 * File system utilities
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve, extname, basename, relative } from 'node:path';
import { FileNotFoundError } from '../errors.js';

/** Read a file as string */
export function readFile(path: string): string {
  const resolved = resolve(path);
  if (!existsSync(resolved)) {
    throw new FileNotFoundError(resolved);
  }
  return readFileSync(resolved, 'utf-8');
}

/** Write content to a file, creating directories as needed */
export function writeFile(path: string, content: string): void {
  const resolved = resolve(path);
  const dir = dirname(resolved);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(resolved, content, 'utf-8');
}

/** Check if a path exists */
export function pathExists(path: string): boolean {
  return existsSync(resolve(path));
}

/** Check if a path is a file */
export function isFile(path: string): boolean {
  const resolved = resolve(path);
  return existsSync(resolved) && statSync(resolved).isFile();
}

/** Check if a path is a directory */
export function isDirectory(path: string): boolean {
  const resolved = resolve(path);
  return existsSync(resolved) && statSync(resolved).isDirectory();
}

/** Ensure a directory exists */
export function ensureDir(path: string): void {
  const resolved = resolve(path);
  if (!existsSync(resolved)) {
    mkdirSync(resolved, { recursive: true });
  }
}

/** Get the extension of a file */
export function getExtension(path: string): string {
  return extname(path).toLowerCase();
}

/** Get the filename without extension */
export function getBasename(path: string): string {
  return basename(path, extname(path));
}

/** Get relative path from one file to another */
export function getRelativePath(from: string, to: string): string {
  return relative(dirname(resolve(from)), resolve(to));
}

/** List files in a directory (non-recursive) */
export function listFiles(dir: string): string[] {
  const resolved = resolve(dir);
  if (!existsSync(resolved)) {
    return [];
  }

  return readdirSync(resolved)
    .map((file) => join(resolved, file))
    .filter((path) => statSync(path).isFile());
}

/** List directories in a directory (non-recursive) */
export function listDirectories(dir: string): string[] {
  const resolved = resolve(dir);
  if (!existsSync(resolved)) {
    return [];
  }

  return readdirSync(resolved)
    .map((file) => join(resolved, file))
    .filter((path) => statSync(path).isDirectory());
}

/** Find files recursively matching a pattern */
export function findFiles(dir: string, pattern: RegExp): string[] {
  const results: string[] = [];
  const resolved = resolve(dir);

  if (!existsSync(resolved)) {
    return results;
  }

  function traverse(currentDir: string): void {
    const entries = readdirSync(currentDir);

    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (stat.isFile() && pattern.test(entry)) {
        results.push(fullPath);
      }
    }
  }

  traverse(resolved);
  return results;
}

/** Resolve a path relative to a base path */
export function resolvePath(base: string, ...paths: string[]): string {
  return resolve(dirname(base), ...paths);
}

/** Get file info */
export interface FileInfo {
  path: string;
  name: string;
  extension: string;
  basename: string;
  directory: string;
}

export function getFileInfo(path: string): FileInfo {
  const resolved = resolve(path);
  return {
    path: resolved,
    name: basename(resolved),
    extension: extname(resolved),
    basename: basename(resolved, extname(resolved)),
    directory: dirname(resolved),
  };
}
