/**
 * Generate command - generates code from OpenAPI/GraphQL specs
 */

import { resolve } from 'node:path';
import { parseOpenAPI } from '../../parsers/openapi/index.js';
import {
  TypeScriptGenerator,
  ZodGenerator,
  ClientGenerator,
  ReactQueryGenerator,
  SwrGenerator,
} from '../../generators/index.js';
import type { IRSchema } from '../../ir/types.js';
import type { BridgeConfig, ResolvedConfig } from '../config.js';
import { resolveConfig, validateConfig, loadConfig } from '../config.js';
import { logger } from '../../utils/logger.js';
import { getExtension, pathExists } from '../../utils/fs.js';
import { formatError, FileNotFoundError } from '../../errors.js';

/** Generate command options */
export interface GenerateOptions {
  /** Input file path */
  input?: string;
  /** Output directory */
  output?: string;
  /** Config file path */
  config?: string;
  /** Disable TypeScript generation */
  noTypescript?: boolean;
  /** Disable Zod generation */
  noZod?: boolean;
  /** Disable client generation */
  noClient?: boolean;
  /** Disable hooks generation */
  noHooks?: boolean;
  /** Use SWR instead of React Query */
  swr?: boolean;
  /** Watch mode */
  watch?: boolean;
}

/**
 * Run the generate command
 */
export async function generate(options: GenerateOptions): Promise<void> {
  try {
    // Load config file if exists
    let config = await loadConfig(options.config);

    // Override config with CLI options
    config = mergeWithCliOptions(config, options);

    // Validate config
    validateConfig(config);

    // Resolve config with defaults
    const resolvedConfig = resolveConfig(config);

    // Run generation
    await runGeneration(resolvedConfig);

    logger.success('Generation complete!');
  } catch (error) {
    logger.error(formatError(error as Error));
    process.exit(1);
  }
}

/**
 * Merge config with CLI options
 */
function mergeWithCliOptions(config: BridgeConfig | null, options: GenerateOptions): BridgeConfig {
  const baseConfig: BridgeConfig = config ?? {
    input: { path: '' },
    output: { dir: '' },
  };

  // Override with CLI options
  if (options.input) {
    baseConfig.input = { path: options.input };
  }

  if (options.output) {
    baseConfig.output = { dir: options.output };
  }

  // Handle generator flags
  if (!baseConfig.generators) {
    baseConfig.generators = {};
  }

  if (options.noTypescript) {
    baseConfig.generators.typescript = false;
  }

  if (options.noZod) {
    baseConfig.generators.zod = false;
  }

  if (options.noClient) {
    baseConfig.generators.client = false;
  }

  if (options.noHooks) {
    baseConfig.generators.hooks = undefined;
  } else if (options.swr) {
    baseConfig.generators.hooks = { type: 'swr' };
  }

  if (options.watch) {
    baseConfig.watch = true;
  }

  return baseConfig;
}

/**
 * Run the code generation
 */
async function runGeneration(config: ResolvedConfig): Promise<void> {
  const inputPath = resolve(config.input.path);
  const outputDir = resolve(config.output.dir);

  // Check input file exists
  if (!pathExists(inputPath)) {
    throw new FileNotFoundError(inputPath);
  }

  // Detect input type
  const inputType = config.input.type ?? detectInputType(inputPath);

  logger.step(`Parsing ${inputType} specification...`);

  // Parse input
  let schema: IRSchema;
  if (inputType === 'openapi') {
    schema = await parseOpenAPI(inputPath);
  } else {
    // GraphQL parsing will be added later
    throw new Error('GraphQL parsing not yet implemented');
  }

  logger.success(`Parsed ${schema.types.size} types and ${schema.endpoints.length} endpoints`);

  // Run generators
  const generators = [];

  // TypeScript generator
  if (config.generators.typescript) {
    const tsOptions =
      typeof config.generators.typescript === 'object' ? config.generators.typescript : {};

    generators.push(
      new TypeScriptGenerator(schema, {
        outputDir,
        ...tsOptions,
      })
    );
  }

  // Zod generator
  if (config.generators.zod) {
    const zodOptions = typeof config.generators.zod === 'object' ? config.generators.zod : {};

    generators.push(
      new ZodGenerator(schema, {
        outputDir,
        ...zodOptions,
      })
    );
  }

  // Client generator
  if (config.generators.client) {
    const clientOptions =
      typeof config.generators.client === 'object' ? config.generators.client : {};

    generators.push(
      new ClientGenerator(schema, {
        outputDir,
        ...clientOptions,
      })
    );
  }

  // Hooks generator
  if (config.generators.hooks) {
    const hooksConfig = config.generators.hooks;

    if (hooksConfig.type === 'react-query') {
      generators.push(
        new ReactQueryGenerator(schema, {
          outputDir,
          suspense: hooksConfig.suspense,
          infinite: hooksConfig.infinite,
        })
      );
    } else if (hooksConfig.type === 'swr') {
      generators.push(
        new SwrGenerator(schema, {
          outputDir,
          immutable: hooksConfig.immutable,
          infinite: hooksConfig.infinite,
        })
      );
    }
  }

  // Run all generators
  for (const generator of generators) {
    await generator.run();
    await generator.write();
  }

  // Generate barrel export
  await generateBarrelExport(
    outputDir,
    generators.map((g) => g.filename)
  );
}

/**
 * Detect input type from file extension
 */
function detectInputType(path: string): 'openapi' | 'graphql' {
  const ext = getExtension(path);

  if (ext === '.graphql' || ext === '.gql') {
    return 'graphql';
  }

  // Default to OpenAPI for YAML/JSON
  return 'openapi';
}

/**
 * Generate a barrel export file
 */
async function generateBarrelExport(outputDir: string, files: string[]): Promise<void> {
  const { writeFile } = await import('../../utils/fs.js');

  const exports = files
    .map((file) => {
      const name = file.replace(/\.ts$/, '.js');
      return `export * from './${name}';`;
    })
    .join('\n');

  const content = `// This file was auto-generated by Bridge\n// Do not edit this file directly\n\n${exports}\n`;

  writeFile(resolve(outputDir, 'index.ts'), content);
  logger.success('Generated index.ts');
}
