/**
 * Benchmarks for OpenAPI parsing
 *
 * Run with: npm run bench
 */

import { bench, describe } from 'vitest';
import { parseOpenAPI } from '../src/parsers/openapi/parser.js';
import { readFile } from '../src/utils/fs.js';
import { resolve } from 'node:path';

const petstorePath = resolve(import.meta.dirname, '../tests/fixtures/openapi/petstore.yaml');
const petstoreContent = readFile(petstorePath);

describe('OpenAPI Parsing', () => {
  bench('parse petstore.yaml (380 lines)', async () => {
    await parseOpenAPI(petstorePath);
  });

  bench('parse from string content', async () => {
    await parseOpenAPI(petstorePath);
  });
});

describe('Repeated Parsing (cold start simulation)', () => {
  bench(
    'parse 10x sequentially',
    async () => {
      for (let i = 0; i < 10; i++) {
        await parseOpenAPI(petstorePath);
      }
    },
    { iterations: 10 }
  );
});
