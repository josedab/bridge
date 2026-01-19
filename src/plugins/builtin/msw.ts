/**
 * Built-in MSW mocks plugin
 */

import { definePlugin } from '../types.js';
import { MswGenerator, type MswGeneratorOptions } from '../../generators/msw/index.js';

export interface MswPluginOptions {
  /** Base URL for the API */
  baseUrl?: string;
  /** Include faker-based mock data generators */
  includeFakers?: boolean;
}

/**
 * MSW mocks plugin factory
 */
export const bridgeMsw = definePlugin<MswPluginOptions>((options = {}) => ({
  name: 'bridge:msw',

  async generate(context) {
    const generatorOptions: MswGeneratorOptions = {
      outputDir: context.outputDir,
      ...options,
    };

    const generator = new MswGenerator(context.schema, generatorOptions);
    return generator.run();
  },
}));
