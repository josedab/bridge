import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { execSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const CLI_PATH = resolve(__dirname, '../../dist/cli/index.js');
const FIXTURES_PATH = resolve(__dirname, '../fixtures');
const TEMP_DIR = resolve(__dirname, '../.temp-cli-test');

/**
 * Execute CLI command and return result
 */
function runCli(args: string[], options: { cwd?: string } = {}): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(`node ${CLI_PATH} ${args.join(' ')}`, {
      cwd: options.cwd ?? TEMP_DIR,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { stdout, stderr: '', exitCode: 0 };
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: execError.stdout ?? '',
      stderr: execError.stderr ?? '',
      exitCode: execError.status ?? 1,
    };
  }
}

describe('CLI Integration Tests', () => {
  beforeAll(() => {
    // Ensure dist exists (tests require built CLI)
    if (!existsSync(CLI_PATH)) {
      throw new Error(
        'CLI not built. Run `npm run build` before running e2e tests.'
      );
    }

    // Create temp directory
    if (existsSync(TEMP_DIR)) {
      rmSync(TEMP_DIR, { recursive: true });
    }
    mkdirSync(TEMP_DIR, { recursive: true });
  });

  afterAll(() => {
    // Cleanup temp directory
    if (existsSync(TEMP_DIR)) {
      rmSync(TEMP_DIR, { recursive: true });
    }
  });

  beforeEach(() => {
    // Clean temp directory between tests
    const files = ['bridge.config.ts', 'output'];
    for (const file of files) {
      const path = join(TEMP_DIR, file);
      if (existsSync(path)) {
        rmSync(path, { recursive: true });
      }
    }
  });

  describe('bridge --help', () => {
    it('should display help information', () => {
      const result = runCli(['--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('bridge');
      expect(result.stdout).toContain('Type-safe API client generator');
      expect(result.stdout).toContain('generate');
      expect(result.stdout).toContain('init');
    });

    it('should display version', () => {
      const result = runCli(['--version']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
    });
  });

  describe('bridge init', () => {
    it('should create bridge.config.ts with OpenAPI template', () => {
      const result = runCli(['init', '--type', 'openapi']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Created bridge.config.ts');

      const configPath = join(TEMP_DIR, 'bridge.config.ts');
      expect(existsSync(configPath)).toBe(true);

      const content = readFileSync(configPath, 'utf-8');
      expect(content).toContain("type: 'openapi'");
      expect(content).toContain('defineConfig');
    });

    it('should create bridge.config.ts with GraphQL template', () => {
      const result = runCli(['init', '--type', 'graphql']);

      expect(result.exitCode).toBe(0);

      const configPath = join(TEMP_DIR, 'bridge.config.ts');
      const content = readFileSync(configPath, 'utf-8');
      expect(content).toContain("type: 'graphql'");
    });

    it('should fail if config already exists without --force', () => {
      // Create initial config
      runCli(['init']);

      // Try to create again
      const result = runCli(['init']);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('already exists');
    });

    it('should overwrite config with --force flag', () => {
      // Create initial OpenAPI config
      runCli(['init', '--type', 'openapi']);

      // Overwrite with GraphQL config
      const result = runCli(['init', '--type', 'graphql', '--force']);

      expect(result.exitCode).toBe(0);

      const configPath = join(TEMP_DIR, 'bridge.config.ts');
      const content = readFileSync(configPath, 'utf-8');
      expect(content).toContain("type: 'graphql'");
    });
  });

  describe('bridge generate', () => {
    const petstoreSpec = join(FIXTURES_PATH, 'openapi/petstore.yaml');
    const outputDir = join(TEMP_DIR, 'output');

    it('should generate TypeScript types from OpenAPI spec', () => {
      const result = runCli([
        'generate',
        '-i', petstoreSpec,
        '-o', outputDir,
        '--no-zod',
        '--no-client',
        '--no-hooks',
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Generation complete');

      // Check types.ts was generated
      const typesPath = join(outputDir, 'types.ts');
      expect(existsSync(typesPath)).toBe(true);

      const content = readFileSync(typesPath, 'utf-8');
      expect(content).toContain('interface Pet');
      expect(content).toContain('enum PetStatus');
    });

    it('should generate all outputs by default', () => {
      const result = runCli([
        'generate',
        '-i', petstoreSpec,
        '-o', outputDir,
      ]);

      expect(result.exitCode).toBe(0);

      // Check all files were generated
      expect(existsSync(join(outputDir, 'types.ts'))).toBe(true);
      expect(existsSync(join(outputDir, 'schemas.ts'))).toBe(true);
      expect(existsSync(join(outputDir, 'client.ts'))).toBe(true);
      expect(existsSync(join(outputDir, 'hooks.ts'))).toBe(true);
      expect(existsSync(join(outputDir, 'index.ts'))).toBe(true);
    });

    it('should generate SWR hooks with --swr flag', () => {
      const result = runCli([
        'generate',
        '-i', petstoreSpec,
        '-o', outputDir,
        '--no-zod',
        '--no-client',
        '--swr',
      ]);

      expect(result.exitCode).toBe(0);

      const hooksPath = join(outputDir, 'hooks.ts');
      expect(existsSync(hooksPath)).toBe(true);

      const content = readFileSync(hooksPath, 'utf-8');
      expect(content).toContain('useSWR');
    });

    it('should fail with non-existent input file', () => {
      const result = runCli([
        'generate',
        '-i', '/non/existent/file.yaml',
        '-o', outputDir,
      ]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('not found');
    });

    it('should use short alias -g for generate', () => {
      const result = runCli([
        'g',
        '-i', petstoreSpec,
        '-o', outputDir,
        '--no-zod',
        '--no-client',
        '--no-hooks',
      ]);

      expect(result.exitCode).toBe(0);
      expect(existsSync(join(outputDir, 'types.ts'))).toBe(true);
    });
  });

  describe('bridge generate --help', () => {
    it('should display generate command help', () => {
      const result = runCli(['generate', '--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('--input');
      expect(result.stdout).toContain('--output');
      expect(result.stdout).toContain('--config');
      expect(result.stdout).toContain('--watch');
      expect(result.stdout).toContain('--swr');
    });
  });

  describe('error handling', () => {
    it('should show help when no command provided', () => {
      const result = runCli([]);

      // CLI shows help but exits with 1 to indicate a command is required
      expect(result.exitCode).toBe(1);
      // Help output may go to stdout or stderr depending on exit code
      const output = result.stdout + result.stderr;
      expect(output).toContain('Usage:');
    });

    it('should error on unknown command', () => {
      const result = runCli(['unknown-command']);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('unknown command');
    });

    it('should error when generate missing required input', () => {
      const result = runCli(['generate', '-o', join(TEMP_DIR, 'output')]);

      expect(result.exitCode).toBe(1);
    });
  });
});
