/**
 * Plugin loader - manages loading and executing plugins
 */

import type { IRSchema } from '../ir/types.js';
import type { GeneratedFile } from '../generators/base.js';
import type { Plugin, PluginContext, PluginConfig, PluginRunResult } from './types.js';
import { isPlugin, isPluginFactory } from './types.js';
import { logger } from '../utils/logger.js';

/**
 * Plugin loader class for managing plugins
 */
export class PluginLoader {
  private plugins: Plugin[] = [];
  private pluginOptions: Map<string, Record<string, unknown>> = new Map();

  /**
   * Register a plugin
   */
  register(plugin: Plugin, options: Record<string, unknown> = {}): void {
    // Check for duplicate names
    if (this.plugins.some((p) => p.name === plugin.name)) {
      throw new Error(`Plugin '${plugin.name}' is already registered`);
    }
    this.plugins.push(plugin);
    this.pluginOptions.set(plugin.name, options);
    logger.debug(`Registered plugin: ${plugin.name}`);
  }

  /**
   * Load plugins from configuration
   */
  loadFromConfig(configs: PluginConfig[]): void {
    for (const config of configs) {
      const plugin = this.resolvePlugin(config);
      this.register(plugin, config.options ?? {});
    }
  }

  /**
   * Resolve a plugin from configuration
   */
  private resolvePlugin(config: PluginConfig): Plugin {
    const { plugin: pluginOrFactory, options = {} } = config;

    if (isPlugin(pluginOrFactory)) {
      return pluginOrFactory;
    }

    if (isPluginFactory(pluginOrFactory)) {
      return pluginOrFactory(options);
    }

    throw new Error('Invalid plugin configuration');
  }

  /**
   * Run all registered plugins
   */
  async run(schema: IRSchema, outputDir: string): Promise<PluginRunResult> {
    const allFiles: GeneratedFile[] = [];
    const errors: Error[] = [];

    // Create the plugin context
    const baseContext: Omit<PluginContext, 'options'> = {
      schema,
      outputDir,
    };

    // Run beforeGenerate hooks
    for (const plugin of this.plugins) {
      if (plugin.hooks?.beforeGenerate) {
        try {
          const context: PluginContext = {
            ...baseContext,
            options: this.pluginOptions.get(plugin.name) ?? {},
          };
          await plugin.hooks.beforeGenerate(context);
        } catch (error) {
          logger.error(`Plugin '${plugin.name}' beforeGenerate hook failed`);
          errors.push(error instanceof Error ? error : new Error(String(error)));
        }
      }
    }

    // Run generate for each plugin
    for (const plugin of this.plugins) {
      try {
        logger.step(`Running plugin: ${plugin.name}...`);

        const context: PluginContext = {
          ...baseContext,
          options: this.pluginOptions.get(plugin.name) ?? {},
        };

        const files = await plugin.generate(context);
        allFiles.push(...files);

        logger.success(`Plugin '${plugin.name}' generated ${files.length} file(s)`);
      } catch (error) {
        logger.error(`Plugin '${plugin.name}' failed`);
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    // Run afterGenerate hooks (in reverse order for cleanup)
    let processedFiles = allFiles;
    for (const plugin of [...this.plugins].reverse()) {
      if (plugin.hooks?.afterGenerate) {
        try {
          const context: PluginContext = {
            ...baseContext,
            options: this.pluginOptions.get(plugin.name) ?? {},
          };
          processedFiles = await plugin.hooks.afterGenerate(context, processedFiles);
        } catch (error) {
          logger.error(`Plugin '${plugin.name}' afterGenerate hook failed`);
          errors.push(error instanceof Error ? error : new Error(String(error)));
        }
      }
    }

    return {
      files: processedFiles,
      errors,
    };
  }

  /**
   * Get all registered plugins
   */
  getPlugins(): readonly Plugin[] {
    return this.plugins;
  }

  /**
   * Clear all registered plugins
   */
  clear(): void {
    this.plugins = [];
    this.pluginOptions.clear();
  }
}

/**
 * Create a new plugin loader
 */
export function createPluginLoader(): PluginLoader {
  return new PluginLoader();
}
