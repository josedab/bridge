/**
 * Built-in TanStack Router plugin
 */

import { definePlugin } from '../types.js';
import {
  TanStackRouterGenerator,
  type TanStackRouterGeneratorOptions,
} from '../../generators/tanstack-router/index.js';

export interface TanStackRouterPluginOptions {
  /** Generate React Query integration for loaders */
  withReactQuery?: boolean;
  /** Generate route definitions */
  generateRoutes?: boolean;
}

/**
 * TanStack Router loaders plugin factory
 */
export const bridgeTanStackRouter = definePlugin<TanStackRouterPluginOptions>((options = {}) => ({
  name: 'bridge:tanstack-router',

  async generate(context) {
    const generatorOptions: TanStackRouterGeneratorOptions = {
      outputDir: context.outputDir,
      ...options,
    };

    const generator = new TanStackRouterGenerator(context.schema, generatorOptions);
    return generator.run();
  },
}));
