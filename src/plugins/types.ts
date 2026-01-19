/**
 * Plugin system type definitions
 *
 * Plugins allow extending Bridge with custom code generators.
 */

import type { IRSchema } from '../ir/types.js';
import type { GeneratedFile } from '../generators/base.js';

/**
 * Plugin context provided to plugins during generation
 */
export interface PluginContext {
  /** The parsed IR schema */
  schema: IRSchema;
  /** Output directory for generated files */
  outputDir: string;
  /** Configuration options passed to the plugin */
  options: Record<string, unknown>;
}

/**
 * Plugin hook functions
 */
export interface PluginHooks {
  /**
   * Called before any generators run
   * Can be used to modify the schema or context
   */
  beforeGenerate?: (context: PluginContext) => Promise<void> | void;

  /**
   * Called after all generators have run
   * Can be used for post-processing
   */
  afterGenerate?: (
    context: PluginContext,
    files: GeneratedFile[]
  ) => Promise<GeneratedFile[]> | GeneratedFile[];
}

/**
 * Plugin definition
 */
export interface Plugin {
  /** Unique plugin name */
  name: string;

  /**
   * Generate code files
   * @param context Plugin context with schema and options
   * @returns Array of generated files
   */
  generate: (context: PluginContext) => Promise<GeneratedFile[]> | GeneratedFile[];

  /** Optional lifecycle hooks */
  hooks?: PluginHooks;
}

/**
 * Plugin factory function type
 */
export type PluginFactory<TOptions = Record<string, unknown>> = (options?: TOptions) => Plugin;

/**
 * Plugin configuration in bridge.config.ts
 */
export interface PluginConfig {
  /** Plugin instance or factory */
  plugin: Plugin | PluginFactory;
  /** Plugin options */
  options?: Record<string, unknown>;
}

/**
 * Result of running plugins
 */
export interface PluginRunResult {
  /** All generated files */
  files: GeneratedFile[];
  /** Any errors that occurred */
  errors: Error[];
}

/**
 * Helper to define a plugin with type inference
 */
export function definePlugin<TOptions = Record<string, unknown>>(
  factory: PluginFactory<TOptions>
): PluginFactory<TOptions> {
  return factory;
}

/**
 * Check if a value is a Plugin
 */
export function isPlugin(value: unknown): value is Plugin {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return typeof obj.name === 'string' && typeof obj.generate === 'function';
}

/**
 * Check if a value is a PluginFactory
 */
export function isPluginFactory(value: unknown): value is PluginFactory {
  return typeof value === 'function';
}
