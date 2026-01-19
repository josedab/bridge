/**
 * Configuration file loader for Bridge
 */

import { pathExists, readFile } from '../utils/fs.js';
import { ConfigError } from '../errors.js';
import { resolve } from 'node:path';

/** Input configuration */
export interface InputConfig {
  /** Path to the input file */
  path: string;
  /** Type of input (auto-detected if not specified) */
  type?: 'openapi' | 'graphql';
}

/** Generator configuration */
export interface GeneratorsConfig {
  /** TypeScript types generator */
  typescript?:
    | boolean
    | {
        enumsAsConst?: boolean;
        generateTypeGuards?: boolean;
      };
  /** Zod schemas generator */
  zod?:
    | boolean
    | {
        inferTypes?: boolean;
      };
  /** HTTP client generator */
  client?:
    | boolean
    | {
        baseUrl?: string;
        style?: 'functions' | 'class';
      };
  /** Hooks generator */
  hooks?: {
    type: 'react-query' | 'swr';
    suspense?: boolean;
    infinite?: boolean;
    immutable?: boolean;
  };
}

/** Bridge configuration */
export interface BridgeConfig {
  /** Input source configuration */
  input: InputConfig;
  /** Output configuration */
  output: {
    /** Output directory */
    dir: string;
  };
  /** Generator configurations */
  generators?: GeneratorsConfig;
  /** Watch mode options */
  watch?:
    | boolean
    | {
        /** Debounce delay in ms */
        debounce?: number;
      };
}

/** Resolved configuration with all defaults applied */
export interface ResolvedConfig extends BridgeConfig {
  generators: Required<GeneratorsConfig>;
}

/** Default configuration */
const defaultConfig: Partial<BridgeConfig> = {
  generators: {
    typescript: true,
    zod: true,
    client: true,
    hooks: {
      type: 'react-query',
    },
  },
};

/** Config file names to search for */
const CONFIG_FILE_NAMES = [
  'bridge.config.ts',
  'bridge.config.js',
  'bridge.config.mjs',
  'bridge.config.json',
];

/**
 * Load configuration from a file
 */
export async function loadConfig(configPath?: string): Promise<BridgeConfig | null> {
  let resolvedPath: string | undefined;

  if (configPath) {
    resolvedPath = resolve(configPath);
    if (!pathExists(resolvedPath)) {
      throw new ConfigError(`Config file not found: ${configPath}`);
    }
  } else {
    // Search for config file
    for (const name of CONFIG_FILE_NAMES) {
      const testPath = resolve(process.cwd(), name);
      if (pathExists(testPath)) {
        resolvedPath = testPath;
        break;
      }
    }
  }

  if (!resolvedPath) {
    return null;
  }

  // Load the config file
  if (resolvedPath.endsWith('.json')) {
    const content = readFile(resolvedPath);
    return JSON.parse(content) as BridgeConfig;
  }

  // For JS/TS files, use dynamic import
  try {
    const module = await import(resolvedPath);
    const config = module.default ?? module;

    // Handle defineConfig wrapper
    if (typeof config === 'function') {
      return config();
    }

    return config as BridgeConfig;
  } catch (error) {
    throw new ConfigError(`Failed to load config file: ${(error as Error).message}`);
  }
}

/**
 * Resolve configuration with defaults
 */
export function resolveConfig(config: BridgeConfig): ResolvedConfig {
  return {
    ...config,
    generators: {
      typescript: config.generators?.typescript ?? defaultConfig.generators?.typescript ?? true,
      zod: config.generators?.zod ?? defaultConfig.generators?.zod ?? true,
      client: config.generators?.client ?? defaultConfig.generators?.client ?? true,
      hooks: config.generators?.hooks ?? defaultConfig.generators?.hooks ?? { type: 'react-query' },
    },
  };
}

/**
 * Define config helper for better TypeScript support
 */
export function defineConfig(config: BridgeConfig): BridgeConfig {
  return config;
}

/**
 * Validate configuration
 */
export function validateConfig(config: BridgeConfig): void {
  if (!config.input) {
    throw new ConfigError('Missing required "input" configuration');
  }

  if (!config.input.path) {
    throw new ConfigError('Missing required "input.path" configuration');
  }

  if (!config.output) {
    throw new ConfigError('Missing required "output" configuration');
  }

  if (!config.output.dir) {
    throw new ConfigError('Missing required "output.dir" configuration');
  }
}
