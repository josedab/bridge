/**
 * Init command - creates a bridge.config.ts file
 */

import { resolve } from 'node:path';
import { pathExists, writeFile } from '../../utils/fs.js';
import { logger } from '../../utils/logger.js';

/** Init command options */
export interface InitOptions {
  /** Type of input (openapi or graphql) */
  type?: 'openapi' | 'graphql';
  /** Force overwrite existing config */
  force?: boolean;
}

/** Config template for OpenAPI */
const OPENAPI_TEMPLATE = `import { defineConfig } from '@bridge/core';

export default defineConfig({
  input: {
    path: './openapi.yaml',
    type: 'openapi',
  },
  output: {
    dir: './src/api',
  },
  generators: {
    typescript: true,
    zod: true,
    client: {
      baseUrl: 'https://api.example.com',
    },
    hooks: {
      type: 'react-query',
    },
  },
});
`;

/** Config template for GraphQL */
const GRAPHQL_TEMPLATE = `import { defineConfig } from '@bridge/core';

export default defineConfig({
  input: {
    path: './schema.graphql',
    type: 'graphql',
  },
  output: {
    dir: './src/api',
  },
  generators: {
    typescript: true,
    zod: true,
    client: {
      baseUrl: 'https://api.example.com/graphql',
    },
    hooks: {
      type: 'react-query',
    },
  },
});
`;

/**
 * Run the init command
 */
export async function init(options: InitOptions): Promise<void> {
  const configPath = resolve(process.cwd(), 'bridge.config.ts');

  // Check if config already exists
  if (pathExists(configPath) && !options.force) {
    logger.error('Config file already exists. Use --force to overwrite.');
    process.exit(1);
  }

  // Select template based on type
  const template = options.type === 'graphql' ? GRAPHQL_TEMPLATE : OPENAPI_TEMPLATE;

  // Write config file
  writeFile(configPath, template);

  logger.success('Created bridge.config.ts');
  logger.info('Edit the config file to set your input and output paths.');
}
