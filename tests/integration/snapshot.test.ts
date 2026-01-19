/**
 * Snapshot tests for generated output
 *
 * These tests verify that the generated code matches the expected golden files.
 * To update snapshots, run: npm test -- --update
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { resolve, join, basename } from 'path';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { parseOpenAPI } from '../../src/parsers/openapi/parser.js';
import { TypeScriptGenerator } from '../../src/generators/typescript/index.js';
import { ZodGenerator } from '../../src/generators/zod/index.js';
import { ClientGenerator } from '../../src/generators/client/index.js';
import { ReactQueryGenerator } from '../../src/generators/react-query/index.js';
import { SwrGenerator } from '../../src/generators/swr/index.js';
import { MswGenerator } from '../../src/generators/msw/index.js';
import type { IRSchema } from '../../src/ir/types.js';
import type { GeneratedFile } from '../../src/generators/base.js';

const FIXTURES_DIR = resolve(__dirname, '../fixtures');
const SNAPSHOTS_DIR = resolve(__dirname, '../snapshots');

interface TestCase {
  name: string;
  fixture: string;
  generators: {
    name: string;
    factory: (schema: IRSchema) => { run: () => Promise<GeneratedFile[]> };
  }[];
}

const TEST_CASES: TestCase[] = [
  {
    name: 'petstore',
    fixture: 'openapi/petstore.yaml',
    generators: [
      {
        name: 'types',
        factory: (schema) =>
          new TypeScriptGenerator(schema, {
            outputDir: '',
            generateTypeGuards: true,
          }),
      },
      {
        name: 'types-no-guards',
        factory: (schema) =>
          new TypeScriptGenerator(schema, {
            outputDir: '',
            generateTypeGuards: false,
          }),
      },
      {
        name: 'schemas',
        factory: (schema) =>
          new ZodGenerator(schema, {
            outputDir: '',
          }),
      },
      {
        name: 'client',
        factory: (schema) =>
          new ClientGenerator(schema, {
            outputDir: '',
            baseUrl: 'https://api.petstore.example.com/v1',
          }),
      },
      {
        name: 'hooks-react-query',
        factory: (schema) =>
          new ReactQueryGenerator(schema, {
            outputDir: '',
          }),
      },
      {
        name: 'hooks-swr',
        factory: (schema) =>
          new SwrGenerator(schema, {
            outputDir: '',
          }),
      },
      {
        name: 'mocks',
        factory: (schema) =>
          new MswGenerator(schema, {
            outputDir: '',
            baseUrl: 'https://api.petstore.example.com/v1',
          }),
      },
    ],
  },
];

/**
 * Normalize generated code for comparison
 */
function normalizeCode(code: string): string {
  return code
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}

/**
 * Read a snapshot file, returning null if it doesn't exist
 */
async function readSnapshot(path: string): Promise<string | null> {
  try {
    const content = await readFile(path, 'utf-8');
    return content;
  } catch {
    return null;
  }
}

/**
 * Write a snapshot file
 */
async function writeSnapshot(path: string, content: string): Promise<void> {
  const dir = path.substring(0, path.lastIndexOf('/'));
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(path, content, 'utf-8');
}

describe('Snapshot Tests', () => {
  for (const testCase of TEST_CASES) {
    describe(testCase.name, () => {
      let schema: IRSchema;

      beforeAll(async () => {
        const fixturePath = join(FIXTURES_DIR, testCase.fixture);
        schema = await parseOpenAPI(fixturePath);
      });

      for (const generator of testCase.generators) {
        it(`should match snapshot for ${generator.name}`, async () => {
          const gen = generator.factory(schema);
          const files = await gen.run();

          expect(files.length).toBeGreaterThan(0);

          for (const file of files) {
            const filename = basename(file.path);
            const snapshotPath = join(
              SNAPSHOTS_DIR,
              testCase.name,
              `${generator.name}.${filename}`
            );
            const expectedContent = await readSnapshot(snapshotPath);
            const actualContent = normalizeCode(file.content);

            if (expectedContent === null) {
              // Snapshot doesn't exist, create it
              await writeSnapshot(snapshotPath, actualContent);
              console.log(`Created snapshot: ${snapshotPath}`);
              // Still fail the test to indicate a new snapshot was created
              expect.fail(`Snapshot created at ${snapshotPath}. Re-run tests to verify.`);
            } else {
              // Compare with existing snapshot
              expect(actualContent).toBe(normalizeCode(expectedContent));
            }
          }
        });
      }
    });
  }
});

describe('Snapshot Utilities', () => {
  it('should normalize code correctly', () => {
    const input = '  line1  \n  line2  \n\n';
    const expected = 'line1\n  line2';
    expect(normalizeCode(input)).toBe(expected);
  });
});
