/**
 * Custom error types for the Bridge code generator
 */

/** Base error class for all Bridge errors */
export class BridgeError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'BridgeError';
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/** Error during parsing input schemas */
export class ParseError extends BridgeError {
  constructor(
    message: string,
    public readonly source: string,
    public readonly location?: { line?: number; column?: number },
    details?: Record<string, unknown>
  ) {
    super(message, 'PARSE_ERROR', { source, location, ...details });
    this.name = 'ParseError';
  }
}

/** Error when resolving $ref references */
export class RefResolutionError extends BridgeError {
  constructor(
    public readonly ref: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'REF_RESOLUTION_ERROR', { ref, ...details });
    this.name = 'RefResolutionError';
  }
}

/** Error when a circular reference is detected */
export class CircularRefError extends RefResolutionError {
  constructor(
    ref: string,
    public readonly path: string[]
  ) {
    super(ref, `Circular reference detected: ${path.join(' -> ')}`, { path });
    this.name = 'CircularRefError';
  }
}

/** Error during code generation */
export class GeneratorError extends BridgeError {
  constructor(
    message: string,
    public readonly generator: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'GENERATOR_ERROR', { generator, ...details });
    this.name = 'GeneratorError';
  }
}

/** Error in configuration */
export class ConfigError extends BridgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFIG_ERROR', details);
    this.name = 'ConfigError';
  }
}

/** Error when a file cannot be found */
export class FileNotFoundError extends BridgeError {
  constructor(public readonly path: string) {
    super(`File not found: ${path}`, 'FILE_NOT_FOUND', { path });
    this.name = 'FileNotFoundError';
  }
}

/** Error when schema validation fails */
export class ValidationError extends BridgeError {
  constructor(
    message: string,
    public readonly errors: Array<{ path: string; message: string }>
  ) {
    super(message, 'VALIDATION_ERROR', { errors });
    this.name = 'ValidationError';
  }
}

/** Format error for user-friendly output */
export function formatError(error: Error): string {
  if (error instanceof BridgeError) {
    let message = `[${error.code}] ${error.message}`;

    if (error instanceof ParseError && error.location) {
      const { line, column } = error.location;
      if (line !== undefined) {
        message += `\n  at ${error.source}:${line}${column !== undefined ? `:${column}` : ''}`;
      }
    }

    if (error instanceof CircularRefError) {
      message += `\n  Reference path: ${error.path.join(' -> ')}`;
    }

    if (error instanceof ValidationError) {
      message += '\n  Validation errors:';
      for (const err of error.errors) {
        message += `\n    - ${err.path}: ${err.message}`;
      }
    }

    return message;
  }

  return error.message;
}

/** Check if an error is a BridgeError */
export function isBridgeError(error: unknown): error is BridgeError {
  return error instanceof BridgeError;
}
