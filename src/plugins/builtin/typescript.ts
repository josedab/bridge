/**
 * Built-in TypeScript types plugin
 */

import { definePlugin } from '../types.js';
import {
  TypeScriptGenerator,
  type TypeScriptGeneratorOptions,
} from '../../generators/typescript/index.js';

export interface TypeScriptPluginOptions {
  /** Generate enums as const objects instead of TypeScript enums */
  enumsAsConst?: boolean;
  /** Generate type guards for discriminated unions */
  generateTypeGuards?: boolean;
  /** Generate input types for mutations */
  generateInputTypes?: boolean;
}

/**
 * TypeScript types plugin factory
 */
export const bridgeTypescript = definePlugin<TypeScriptPluginOptions>((options = {}) => ({
  name: 'bridge:typescript',

  async generate(context) {
    const generatorOptions: TypeScriptGeneratorOptions = {
      outputDir: context.outputDir,
      ...options,
    };

    const generator = new TypeScriptGenerator(context.schema, generatorOptions);
    return generator.run();
  },
}));
