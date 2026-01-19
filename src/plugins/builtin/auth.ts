/**
 * Built-in Auth helpers plugin
 */

import { definePlugin } from '../types.js';
import { AuthGenerator, type AuthGeneratorOptions } from '../../generators/auth/index.js';

export interface AuthPluginOptions {
  /** Generate middleware-style functions */
  middleware?: boolean;
}

/**
 * Auth helpers plugin factory
 */
export const bridgeAuth = definePlugin<AuthPluginOptions>((options = {}) => ({
  name: 'bridge:auth',

  async generate(context) {
    const generatorOptions: AuthGeneratorOptions = {
      outputDir: context.outputDir,
      ...options,
    };

    const generator = new AuthGenerator(context.schema, generatorOptions);
    return generator.run();
  },
}));
