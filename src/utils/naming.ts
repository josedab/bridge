/**
 * Naming utilities for converting between different case conventions
 */

/** Convert string to camelCase */
export function camelCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^[A-Z]/, (c) => c.toLowerCase());
}

/** Convert string to PascalCase */
export function pascalCase(str: string): string {
  const camel = camelCase(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

/** Convert string to snake_case */
export function snakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .toLowerCase();
}

/** Convert string to kebab-case */
export function kebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
}

/** Convert string to CONSTANT_CASE */
export function constantCase(str: string): string {
  return snakeCase(str).toUpperCase();
}

/** Check if a string is a valid TypeScript identifier */
export function isValidIdentifier(str: string): boolean {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(str);
}

/** Reserved TypeScript keywords */
const RESERVED_KEYWORDS = new Set([
  'abstract',
  'any',
  'as',
  'asserts',
  'async',
  'await',
  'boolean',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'constructor',
  'continue',
  'debugger',
  'declare',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'from',
  'function',
  'get',
  'if',
  'implements',
  'import',
  'in',
  'infer',
  'instanceof',
  'interface',
  'is',
  'keyof',
  'let',
  'module',
  'namespace',
  'never',
  'new',
  'null',
  'number',
  'object',
  'of',
  'package',
  'private',
  'protected',
  'public',
  'readonly',
  'require',
  'return',
  'set',
  'static',
  'string',
  'super',
  'switch',
  'symbol',
  'this',
  'throw',
  'true',
  'try',
  'type',
  'typeof',
  'undefined',
  'unique',
  'unknown',
  'var',
  'void',
  'while',
  'with',
  'yield',
]);

/** Check if a string is a reserved TypeScript keyword */
export function isReservedKeyword(str: string): boolean {
  return RESERVED_KEYWORDS.has(str);
}

/** Sanitize a string to be a valid TypeScript identifier */
export function sanitizeIdentifier(str: string): string {
  // Remove invalid characters
  let sanitized = str.replace(/[^a-zA-Z0-9_$]/g, '_');

  // Ensure it starts with a valid character
  if (/^[0-9]/.test(sanitized)) {
    sanitized = '_' + sanitized;
  }

  // Handle reserved keywords
  if (isReservedKeyword(sanitized)) {
    sanitized = sanitized + '_';
  }

  return sanitized;
}

/** Generate a safe type name from a path or schema name */
export function toTypeName(str: string): string {
  // Handle paths like /pets/{petId} -> PetsPetId
  const cleaned = str
    .replace(/^\//, '')
    .replace(/\{([^}]+)\}/g, 'By$1')
    .replace(/[^a-zA-Z0-9]/g, ' ');

  return pascalCase(cleaned);
}

/** Generate a safe operation name */
export function toOperationName(method: string, path: string): string {
  const cleaned = path
    .replace(/^\//, '')
    .replace(/\{([^}]+)\}/g, '$1')
    .replace(/[^a-zA-Z0-9]/g, ' ');

  return camelCase(`${method} ${cleaned}`);
}

/** Generate a safe enum member name */
export function toEnumMemberName(value: string | number): string {
  if (typeof value === 'number') {
    return `Value${value < 0 ? 'Neg' : ''}${Math.abs(value)}`;
  }

  // Handle string values
  let name = value
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');

  // Ensure it starts with a valid character
  if (/^[0-9]/.test(name)) {
    name = '_' + name;
  }

  // Convert to PascalCase for enum members
  return pascalCase(name);
}

/** Generate a query key name from an operation */
export function toQueryKeyName(operationId: string): string {
  return camelCase(operationId);
}

/** Generate a hook name from an operation */
export function toHookName(operationId: string, prefix = 'use'): string {
  return prefix + pascalCase(operationId);
}

/** Escape a string for use in a string literal */
export function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

/** Pluralize a word (simple rules) */
export function pluralize(word: string): string {
  if (word.endsWith('y')) {
    return word.slice(0, -1) + 'ies';
  }
  if (word.endsWith('s') || word.endsWith('x') || word.endsWith('ch') || word.endsWith('sh')) {
    return word + 'es';
  }
  return word + 's';
}

/** Singularize a word (simple rules) */
export function singularize(word: string): string {
  if (word.endsWith('ies')) {
    return word.slice(0, -3) + 'y';
  }
  if (word.endsWith('es')) {
    return word.slice(0, -2);
  }
  if (word.endsWith('s') && !word.endsWith('ss')) {
    return word.slice(0, -1);
  }
  return word;
}
