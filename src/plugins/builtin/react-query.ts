/**
 * Built-in React Query hooks plugin
 */

import { definePlugin } from '../types.js';
import {
  ReactQueryGenerator,
  type ReactQueryGeneratorOptions,
} from '../../generators/react-query/index.js';

export interface ReactQueryPluginOptions {
  /** Generate suspense query hooks */
  suspense?: boolean;
  /** Generate infinite query hooks for pagination */
  infinite?: boolean;
  /** React Query version (currently only v5 supported) */
  version?: 5;
}

/**
 * React Query hooks plugin factory
 */
export const bridgeReactQuery = definePlugin<ReactQueryPluginOptions>((options = {}) => ({
  name: 'bridge:react-query',

  async generate(context) {
    const generatorOptions: ReactQueryGeneratorOptions = {
      outputDir: context.outputDir,
      ...options,
    };

    const generator = new ReactQueryGenerator(context.schema, generatorOptions);
    return generator.run();
  },
}));
