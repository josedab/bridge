#!/usr/bin/env node

/**
 * Bridge CLI - Type-safe API client generator
 */

import { Command } from 'commander';
import { generate } from './commands/generate.js';
import { init } from './commands/init.js';
import { startWatch } from './watch.js';
import { resolve } from 'node:path';

const program = new Command();

program
  .name('bridge')
  .description('Type-safe API client generator from OpenAPI and GraphQL specifications')
  .version('0.1.0');

// Generate command
program
  .command('generate')
  .alias('g')
  .description('Generate TypeScript code from an API specification')
  .option('-i, --input <path>', 'Input file path (OpenAPI YAML/JSON or GraphQL schema)')
  .option('-o, --output <dir>', 'Output directory')
  .option('-c, --config <path>', 'Path to config file')
  .option('--no-typescript', 'Disable TypeScript types generation')
  .option('--no-zod', 'Disable Zod schema generation')
  .option('--no-client', 'Disable HTTP client generation')
  .option('--no-hooks', 'Disable hooks generation')
  .option('--swr', 'Use SWR instead of React Query for hooks')
  .option('-w, --watch', 'Watch for changes and regenerate')
  .action(async (options) => {
    const generateOptions = {
      input: options.input,
      output: options.output,
      config: options.config,
      noTypescript: !options.typescript,
      noZod: !options.zod,
      noClient: !options.client,
      noHooks: !options.hooks,
      swr: options.swr,
      watch: options.watch,
    };

    if (options.watch && options.input) {
      // Start watch mode
      startWatch({
        input: resolve(options.input),
        generateOptions,
      });
    } else {
      // Run once
      await generate(generateOptions);
    }
  });

// Init command
program
  .command('init')
  .description('Create a bridge.config.ts configuration file')
  .option('-t, --type <type>', 'Type of input (openapi or graphql)', 'openapi')
  .option('-f, --force', 'Overwrite existing config file')
  .action(async (options) => {
    await init({
      type: options.type as 'openapi' | 'graphql',
      force: options.force,
    });
  });

// Parse and execute
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
