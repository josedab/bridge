/**
 * Watch mode - watches for file changes and regenerates
 */

import { watch as chokidarWatch } from 'chokidar';
import { dirname } from 'node:path';
import { logger } from '../utils/logger.js';
import { generate, type GenerateOptions } from './commands/generate.js';

/** Watch options */
export interface WatchOptions {
  /** Input file to watch */
  input: string;
  /** Debounce delay in ms */
  debounce?: number;
  /** Generate options */
  generateOptions: GenerateOptions;
}

/**
 * Start watch mode
 */
export function startWatch(options: WatchOptions): void {
  const { input, debounce = 300, generateOptions } = options;

  logger.info(`Watching for changes in ${input}...`);

  let timeout: ReturnType<typeof setTimeout> | null = null;
  let isGenerating = false;

  const runGenerate = async () => {
    if (isGenerating) return;

    isGenerating = true;
    logger.step('Changes detected, regenerating...');

    try {
      await generate(generateOptions);
    } catch (error) {
      logger.error(`Generation failed: ${(error as Error).message}`);
    } finally {
      isGenerating = false;
    }
  };

  const debouncedGenerate = () => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(runGenerate, debounce);
  };

  // Watch the input file and its directory
  const watcher = chokidarWatch([input, dirname(input)], {
    ignoreInitial: true,
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50,
    },
  });

  watcher.on('change', (path) => {
    logger.debug(`File changed: ${path}`);
    debouncedGenerate();
  });

  watcher.on('add', (path) => {
    logger.debug(`File added: ${path}`);
    debouncedGenerate();
  });

  watcher.on('unlink', (path) => {
    logger.debug(`File removed: ${path}`);
    debouncedGenerate();
  });

  watcher.on('error', (error: unknown) => {
    logger.error(`Watcher error: ${error instanceof Error ? error.message : String(error)}`);
  });

  // Handle process termination
  const cleanup = () => {
    logger.info('Stopping watch mode...');
    watcher.close();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  logger.success('Watch mode started. Press Ctrl+C to stop.');
}
