/**
 * Built-in HTTP client plugin
 */

import { definePlugin } from '../types.js';
import { ClientGenerator, type ClientGeneratorOptions } from '../../generators/client/index.js';

export interface ClientPluginOptions {
  /** Base URL for the API */
  baseUrl?: string;
  /** Generate individual functions or a class */
  style?: 'functions' | 'class';
  /** Include Zod runtime validation */
  includeValidation?: boolean;
}

/**
 * HTTP client plugin factory
 */
export const bridgeClient = definePlugin<ClientPluginOptions>((options = {}) => ({
  name: 'bridge:client',

  async generate(context) {
    const generatorOptions: ClientGeneratorOptions = {
      outputDir: context.outputDir,
      ...options,
    };

    const generator = new ClientGenerator(context.schema, generatorOptions);
    return generator.run();
  },
}));
