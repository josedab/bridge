/**
 * $ref resolver for OpenAPI schemas
 *
 * Handles:
 * - Local references (#/components/schemas/Pet)
 * - External file references (./common.yaml#/Pet)
 * - Circular reference detection
 */

import { parse as parseYaml } from 'yaml';
import { RefResolutionError } from '../../errors.js';
import { readFile, resolvePath, getExtension } from '../../utils/fs.js';
import type { OpenAPIDocument, ReferenceObject } from './types.js';
import { isReference } from './types.js';

/** Resolved reference result */
export interface ResolvedRef<T> {
  value: T;
  isCircular: boolean;
}

/** Ref resolver class */
export class RefResolver {
  /** Cache for resolved references */
  private cache: Map<string, unknown> = new Map();

  /** Currently resolving references (for circular detection) */
  private resolving: Set<string> = new Set();

  /** External document cache */
  private documentCache: Map<string, OpenAPIDocument> = new Map();

  constructor(
    private rootDocument: OpenAPIDocument,
    private basePath: string
  ) {}

  /**
   * Resolve a $ref reference
   * @param ref The reference string (e.g., "#/components/schemas/Pet")
   * @returns The resolved value
   */
  resolve<T>(ref: string): ResolvedRef<T> {
    // Check cache first
    if (this.cache.has(ref)) {
      return { value: this.cache.get(ref) as T, isCircular: false };
    }

    // Check for circular reference
    if (this.resolving.has(ref)) {
      return { value: { $circularRef: ref } as T, isCircular: true };
    }

    this.resolving.add(ref);

    try {
      const value = this.resolveInternal<T>(ref);
      this.cache.set(ref, value);
      return { value, isCircular: false };
    } finally {
      this.resolving.delete(ref);
    }
  }

  /**
   * Resolve a value that might be a reference
   * @param value The value or reference object
   * @returns The resolved value
   */
  resolveIfRef<T>(value: T | ReferenceObject): ResolvedRef<T> {
    if (isReference(value)) {
      return this.resolve<T>(value.$ref);
    }
    return { value, isCircular: false };
  }

  /**
   * Check if a reference is circular
   */
  isCircular(ref: string): boolean {
    return this.resolving.has(ref);
  }

  /**
   * Get the path to detect circular references
   */
  getResolutionPath(): string[] {
    return Array.from(this.resolving);
  }

  private resolveInternal<T>(ref: string): T {
    // Parse the reference
    const [filePath, pointer] = this.parseRef(ref);

    // Get the document to resolve against
    let document: OpenAPIDocument;
    if (filePath) {
      document = this.loadExternalDocument(filePath);
    } else {
      document = this.rootDocument;
    }

    // Resolve the JSON pointer
    return this.resolvePointer<T>(document, pointer, ref);
  }

  private parseRef(ref: string): [string | null, string] {
    if (ref.startsWith('#')) {
      // Local reference
      return [null, ref.slice(1)];
    }

    // External reference
    const hashIndex = ref.indexOf('#');
    if (hashIndex === -1) {
      // Reference to entire external document
      return [ref, ''];
    }

    return [ref.slice(0, hashIndex), ref.slice(hashIndex + 1)];
  }

  private loadExternalDocument(filePath: string): OpenAPIDocument {
    const absolutePath = resolvePath(this.basePath, filePath);

    // Check cache
    if (this.documentCache.has(absolutePath)) {
      return this.documentCache.get(absolutePath)!;
    }

    // Load and parse the document
    const content = readFile(absolutePath);
    const extension = getExtension(absolutePath);

    let document: OpenAPIDocument;
    if (extension === '.json') {
      document = JSON.parse(content) as OpenAPIDocument;
    } else if (extension === '.yaml' || extension === '.yml') {
      document = parseYaml(content) as OpenAPIDocument;
    } else {
      throw new RefResolutionError(filePath, `Unsupported file extension: ${extension}`);
    }

    this.documentCache.set(absolutePath, document);
    return document;
  }

  private resolvePointer<T>(document: OpenAPIDocument, pointer: string, originalRef: string): T {
    if (!pointer || pointer === '/') {
      return document as unknown as T;
    }

    // Parse JSON pointer
    const parts = pointer
      .split('/')
      .filter(Boolean)
      .map((part) => decodeURIComponent(part.replace(/~1/g, '/').replace(/~0/g, '~')));

    let current: unknown = document;

    for (const part of parts) {
      if (current === null || current === undefined) {
        throw new RefResolutionError(
          originalRef,
          `Cannot resolve reference: path segment "${part}" not found`
        );
      }

      if (typeof current !== 'object') {
        throw new RefResolutionError(
          originalRef,
          `Cannot resolve reference: "${part}" is not an object`
        );
      }

      const obj = current as Record<string, unknown>;
      if (!(part in obj)) {
        throw new RefResolutionError(
          originalRef,
          `Reference not found: ${part} in ${Object.keys(obj).join(', ')}`
        );
      }

      current = obj[part];
    }

    return current as T;
  }

  /**
   * Recursively resolve all references in an object
   * @param obj The object to resolve
   * @param depth Maximum recursion depth
   * @returns The resolved object with all $refs replaced
   */
  resolveDeep<T>(obj: T, depth = 10): T {
    if (depth <= 0) {
      return obj;
    }

    if (obj === null || obj === undefined) {
      return obj;
    }

    if (isReference(obj)) {
      const { value, isCircular } = this.resolve<T>(obj.$ref);
      if (isCircular) {
        return obj; // Keep the reference for circular refs
      }
      return this.resolveDeep(value, depth - 1);
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.resolveDeep(item, depth - 1)) as T;
    }

    if (typeof obj === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.resolveDeep(value, depth - 1);
      }
      return result as T;
    }

    return obj;
  }
}

/**
 * Extract the type name from a reference
 * @param ref The reference string
 * @returns The type name
 */
export function getRefTypeName(ref: string): string {
  const parts = ref.split('/');
  return parts[parts.length - 1] ?? ref;
}

/**
 * Check if a reference is local
 * @param ref The reference string
 * @returns True if the reference is local
 */
export function isLocalRef(ref: string): boolean {
  return ref.startsWith('#');
}

/**
 * Check if a reference points to a schema
 * @param ref The reference string
 * @returns True if the reference is to a schema
 */
export function isSchemaRef(ref: string): boolean {
  return ref.includes('/components/schemas/') || ref.includes('/definitions/');
}
