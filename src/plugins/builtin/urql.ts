/**
 * Built-in urql plugin
 */

import { definePlugin } from '../types.js';
import { UrqlGenerator, type UrqlGeneratorOptions } from '../../generators/urql/index.js';

export interface UrqlPluginOptions {
  /** Include document strings in output */
  includeDocuments?: boolean;
}

/**
 * urql hooks plugin factory
 */
export const bridgeUrql = definePlugin<UrqlPluginOptions>((options = {}) => ({
  name: 'bridge:urql',

  async generate(context) {
    const generatorOptions: UrqlGeneratorOptions = {
      outputDir: context.outputDir,
      ...options,
    };

    const generator = new UrqlGenerator(context.schema, generatorOptions);
    return generator.run();
  },
}));
