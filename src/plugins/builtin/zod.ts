/**
 * Built-in Zod schemas plugin
 */

import { definePlugin } from '../types.js';
import { ZodGenerator, type ZodGeneratorOptions } from '../../generators/zod/index.js';

export interface ZodPluginOptions {
  /** Generate inferred TypeScript types from schemas */
  inferTypes?: boolean;
  /** Generate endpoint schemas */
  generateEndpointSchemas?: boolean;
}

/**
 * Zod schemas plugin factory
 */
export const bridgeZod = definePlugin<ZodPluginOptions>((options = {}) => ({
  name: 'bridge:zod',

  async generate(context) {
    const generatorOptions: ZodGeneratorOptions = {
      outputDir: context.outputDir,
      ...options,
    };

    const generator = new ZodGenerator(context.schema, generatorOptions);
    return generator.run();
  },
}));
