/**
 * Built-in Multi-File TypeScript plugin
 */

import { definePlugin } from '../types.js';
import {
  MultiFileTypeScriptGenerator,
  type MultiFileTypeScriptOptions,
} from '../../generators/typescript/index.js';

export interface MultiFileTypeScriptPluginOptions {
  /** Generate const enums instead of TypeScript enums */
  enumsAsConst?: boolean;
  /** Generate type guards */
  generateTypeGuards?: boolean;
}

/**
 * Multi-file TypeScript types plugin factory
 * Generates individual files per type for better tree-shaking
 */
export const bridgeTypescriptMultiFile = definePlugin<MultiFileTypeScriptPluginOptions>(
  (options = {}) => ({
    name: 'bridge:typescript-multi',

    async generate(context) {
      const generatorOptions: MultiFileTypeScriptOptions = {
        outputDir: context.outputDir,
        ...options,
      };

      const generator = new MultiFileTypeScriptGenerator(context.schema, generatorOptions);
      return generator.run();
    },
  })
);
