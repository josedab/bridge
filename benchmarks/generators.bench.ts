/**
 * Benchmarks for code generators
 *
 * Run with: npm run bench
 */

import { bench, describe, beforeAll } from 'vitest';
import { parseOpenAPI } from '../src/parsers/openapi/parser.js';
import {
  createTypeScriptGenerator,
  createZodGenerator,
  createClientGenerator,
  createReactQueryGenerator,
  createMswGenerator,
} from '../src/generators/index.js';
import type { IRSchema } from '../src/ir/types.js';
import { resolve } from 'node:path';

const petstorePath = resolve(import.meta.dirname, '../tests/fixtures/openapi/petstore.yaml');

let schema: IRSchema;

beforeAll(async () => {
  schema = await parseOpenAPI(petstorePath);
});

describe('TypeScript Generator', () => {
  bench('generate types (default)', () => {
    const generator = createTypeScriptGenerator(schema, {});
    generator.generate();
  });

  bench('generate types with guards', () => {
    const generator = createTypeScriptGenerator(schema, { emitTypeGuards: true });
    generator.generate();
  });

  bench('generate types with helpers', () => {
    const generator = createTypeScriptGenerator(schema, { emitHelperTypes: true });
    generator.generate();
  });
});

describe('Zod Generator', () => {
  bench('generate schemas (default)', () => {
    const generator = createZodGenerator(schema, {});
    generator.generate();
  });

  bench('generate schemas with inferred types', () => {
    const generator = createZodGenerator(schema, { inferTypes: true });
    generator.generate();
  });
});

describe('Client Generator', () => {
  bench('generate client (default)', () => {
    const generator = createClientGenerator(schema, {});
    generator.generate();
  });

  bench('generate client with Zod validation', () => {
    const generator = createClientGenerator(schema, { validateResponse: true });
    generator.generate();
  });
});

describe('React Query Generator', () => {
  bench('generate hooks (default)', () => {
    const generator = createReactQueryGenerator(schema, {});
    generator.generate();
  });

  bench('generate hooks with suspense', () => {
    const generator = createReactQueryGenerator(schema, { useSuspense: true });
    generator.generate();
  });
});

describe('MSW Generator', () => {
  bench('generate mocks (default)', () => {
    const generator = createMswGenerator(schema, {});
    generator.generate();
  });
});

describe('Full Pipeline', () => {
  bench('parse + generate all', async () => {
    const parsed = await parseOpenAPI(petstorePath);

    const tsGen = createTypeScriptGenerator(parsed, {});
    tsGen.generate();

    const zodGen = createZodGenerator(parsed, {});
    zodGen.generate();

    const clientGen = createClientGenerator(parsed, {});
    clientGen.generate();

    const hookGen = createReactQueryGenerator(parsed, {});
    hookGen.generate();

    const mswGen = createMswGenerator(parsed, {});
    mswGen.generate();
  });
});
