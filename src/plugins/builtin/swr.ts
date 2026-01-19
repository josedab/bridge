/**
 * Built-in SWR hooks plugin
 */

import { definePlugin } from '../types.js';
import { SwrGenerator, type SwrGeneratorOptions } from '../../generators/swr/index.js';

export interface SwrPluginOptions {
  /** Generate useSWRImmutable hooks */
  immutable?: boolean;
  /** Generate useSWRInfinite hooks for pagination */
  infinite?: boolean;
}

/**
 * SWR hooks plugin factory
 */
export const bridgeSwr = definePlugin<SwrPluginOptions>((options = {}) => ({
  name: 'bridge:swr',

  async generate(context) {
    const generatorOptions: SwrGeneratorOptions = {
      outputDir: context.outputDir,
      ...options,
    };

    const generator = new SwrGenerator(context.schema, generatorOptions);
    return generator.run();
  },
}));
