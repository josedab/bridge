/**
 * Code formatter using Prettier
 */

import type { Options as PrettierOptions } from 'prettier';
import { logger } from '../utils/logger.js';

/** Default Prettier options for generated code */
const DEFAULT_PRETTIER_OPTIONS: PrettierOptions = {
  parser: 'typescript',
  semi: true,
  singleQuote: true,
  trailingComma: 'es5',
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
};

/** Format configuration */
export interface FormatConfig {
  prettier?: PrettierOptions;
  enabled?: boolean;
}

/**
 * Format TypeScript code using Prettier
 * Uses dynamic import to handle optional Prettier dependency
 */
export async function formatCode(code: string, config: FormatConfig = {}): Promise<string> {
  if (config.enabled === false) {
    return code;
  }

  try {
    // Dynamic import of Prettier
    const prettier = await import('prettier');
    const format = prettier.format ?? prettier.default?.format;

    if (typeof format !== 'function') {
      // Prettier not available or incompatible version
      return code;
    }

    const options = {
      ...DEFAULT_PRETTIER_OPTIONS,
      ...config.prettier,
    };

    return await format(code, options);
  } catch (error) {
    // If Prettier is not installed or fails, return unformatted code
    logger.warn(
      `Code formatting failed: ${(error as Error).message}. Returning unformatted code.`
    );
    return code;
  }
}

/**
 * Check if Prettier is available
 */
export async function isPrettierAvailable(): Promise<boolean> {
  try {
    await import('prettier');
    return true;
  } catch {
    return false;
  }
}

/**
 * Get Prettier config from project if available
 */
export async function loadPrettierConfig(configPath?: string): Promise<PrettierOptions | null> {
  try {
    const prettier = await import('prettier');
    const resolveConfig = prettier.resolveConfig ?? prettier.default?.resolveConfig;

    if (typeof resolveConfig !== 'function') {
      return null;
    }

    return await resolveConfig(configPath ?? process.cwd());
  } catch {
    return null;
  }
}
