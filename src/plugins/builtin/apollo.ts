/**
 * Built-in Apollo Client plugin
 */

import { definePlugin } from '../types.js';
import { ApolloGenerator, type ApolloGeneratorOptions } from '../../generators/apollo/index.js';

export interface ApolloPluginOptions {
  /** Generate suspense-enabled hooks (Apollo Client 3.8+) */
  suspense?: boolean;
  /** Generate lazy query hooks */
  lazyQueries?: boolean;
  /** Include document strings in output */
  includeDocuments?: boolean;
}

/**
 * Apollo Client hooks plugin factory
 */
export const bridgeApollo = definePlugin<ApolloPluginOptions>((options = {}) => ({
  name: 'bridge:apollo',

  async generate(context) {
    const generatorOptions: ApolloGeneratorOptions = {
      outputDir: context.outputDir,
      ...options,
    };

    const generator = new ApolloGenerator(context.schema, generatorOptions);
    return generator.run();
  },
}));
