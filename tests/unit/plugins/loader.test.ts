/**
 * Tests for PluginLoader class
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PluginLoader, createPluginLoader } from '../../../src/plugins/loader.js';
import type { Plugin, PluginConfig } from '../../../src/plugins/types.js';
import type { IRSchema } from '../../../src/ir/types.js';
import type { GeneratedFile } from '../../../src/generators/base.js';

// Mock logger to avoid console output during tests
vi.mock('../../../src/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    step: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Helper to create a minimal IR schema for testing
function createTestSchema(): IRSchema {
  return {
    metadata: {
      title: 'Test API',
      version: '1.0.0',
    },
    types: {},
    endpoints: [],
  };
}

// Helper to create a test plugin
function createTestPlugin(name: string, files: GeneratedFile[] = []): Plugin {
  return {
    name,
    generate: vi.fn().mockResolvedValue(files),
  };
}

describe('PluginLoader', () => {
  let loader: PluginLoader;

  beforeEach(() => {
    loader = new PluginLoader();
  });

  describe('register', () => {
    it('should register a plugin', () => {
      const plugin = createTestPlugin('test-plugin');
      loader.register(plugin);

      const plugins = loader.getPlugins();
      expect(plugins).toHaveLength(1);
      expect(plugins[0].name).toBe('test-plugin');
    });

    it('should allow registering multiple plugins', () => {
      const plugin1 = createTestPlugin('plugin-1');
      const plugin2 = createTestPlugin('plugin-2');

      loader.register(plugin1);
      loader.register(plugin2);

      const plugins = loader.getPlugins();
      expect(plugins).toHaveLength(2);
    });

    it('should throw error when registering duplicate plugin name', () => {
      const plugin1 = createTestPlugin('duplicate');
      const plugin2 = createTestPlugin('duplicate');

      loader.register(plugin1);
      expect(() => loader.register(plugin2)).toThrow("Plugin 'duplicate' is already registered");
    });
  });

  describe('loadFromConfig', () => {
    it('should load plugins from configuration array', () => {
      const plugin = createTestPlugin('config-plugin');
      const configs: PluginConfig[] = [{ plugin }];

      loader.loadFromConfig(configs);

      const plugins = loader.getPlugins();
      expect(plugins).toHaveLength(1);
      expect(plugins[0].name).toBe('config-plugin');
    });

    it('should load plugin factory and call it with options', () => {
      const factory = vi.fn((options?: Record<string, unknown>) => ({
        name: 'factory-plugin',
        generate: vi.fn().mockResolvedValue([]),
        options,
      }));

      const configs: PluginConfig[] = [
        { plugin: factory, options: { key: 'value' } },
      ];

      loader.loadFromConfig(configs);

      expect(factory).toHaveBeenCalledWith({ key: 'value' });
      const plugins = loader.getPlugins();
      expect(plugins).toHaveLength(1);
      expect(plugins[0].name).toBe('factory-plugin');
    });

    it('should throw error for invalid plugin configuration', () => {
      const invalidConfigs = [
        { plugin: 'not-a-plugin' as unknown as Plugin },
      ];

      expect(() => loader.loadFromConfig(invalidConfigs)).toThrow('Invalid plugin configuration');
    });
  });

  describe('run', () => {
    it('should run all registered plugins and collect files', async () => {
      const files1: GeneratedFile[] = [
        { path: 'types.ts', content: 'export type A = string;' },
      ];
      const files2: GeneratedFile[] = [
        { path: 'schemas.ts', content: 'export const schema = {};' },
      ];

      const plugin1 = createTestPlugin('plugin-1', files1);
      const plugin2 = createTestPlugin('plugin-2', files2);

      loader.register(plugin1);
      loader.register(plugin2);

      const schema = createTestSchema();
      const result = await loader.run(schema, '/output');

      expect(result.files).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      expect(plugin1.generate).toHaveBeenCalled();
      expect(plugin2.generate).toHaveBeenCalled();
    });

    it('should pass correct context to plugins', async () => {
      const generateFn = vi.fn().mockResolvedValue([]);
      const plugin: Plugin = {
        name: 'context-test',
        generate: generateFn,
      };

      loader.register(plugin);

      const schema = createTestSchema();
      await loader.run(schema, '/output/dir');

      expect(generateFn).toHaveBeenCalledWith(
        expect.objectContaining({
          schema,
          outputDir: '/output/dir',
          options: {},
        })
      );
    });

    it('should pass plugin options through to context', async () => {
      const generateFn = vi.fn().mockResolvedValue([]);
      const plugin: Plugin = {
        name: 'options-test',
        generate: generateFn,
      };

      const options = { customOption: 'value', nested: { key: 123 } };
      loader.register(plugin, options);

      const schema = createTestSchema();
      await loader.run(schema, '/output/dir');

      expect(generateFn).toHaveBeenCalledWith(
        expect.objectContaining({
          schema,
          outputDir: '/output/dir',
          options,
        })
      );
    });

    it('should pass options from config to hooks', async () => {
      const beforeHook = vi.fn();
      const afterHook = vi.fn((_, files) => files);
      const plugin: Plugin = {
        name: 'hook-options-test',
        generate: vi.fn().mockResolvedValue([]),
        hooks: {
          beforeGenerate: beforeHook,
          afterGenerate: afterHook,
        },
      };

      const options = { hookOption: 'test-value' };
      loader.register(plugin, options);

      const schema = createTestSchema();
      await loader.run(schema, '/output');

      expect(beforeHook).toHaveBeenCalledWith(
        expect.objectContaining({ options })
      );
      expect(afterHook).toHaveBeenCalledWith(
        expect.objectContaining({ options }),
        expect.any(Array)
      );
    });

    it('should pass options loaded from config to plugins', async () => {
      const generateFn = vi.fn().mockResolvedValue([]);
      const factory = vi.fn((_options?: Record<string, unknown>) => ({
        name: 'factory-options-plugin',
        generate: generateFn,
      }));

      const configs: PluginConfig[] = [
        { plugin: factory, options: { configKey: 'configValue' } },
      ];

      loader.loadFromConfig(configs);

      const schema = createTestSchema();
      await loader.run(schema, '/output');

      expect(generateFn).toHaveBeenCalledWith(
        expect.objectContaining({
          options: { configKey: 'configValue' },
        })
      );
    });

    it('should collect errors from failed plugins', async () => {
      const errorPlugin: Plugin = {
        name: 'error-plugin',
        generate: vi.fn().mockRejectedValue(new Error('Plugin failed')),
      };

      loader.register(errorPlugin);

      const schema = createTestSchema();
      const result = await loader.run(schema, '/output');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Plugin failed');
    });

    it('should continue running other plugins when one fails', async () => {
      const errorPlugin: Plugin = {
        name: 'error-plugin',
        generate: vi.fn().mockRejectedValue(new Error('Failed')),
      };
      const successPlugin = createTestPlugin('success-plugin', [
        { path: 'test.ts', content: 'test' },
      ]);

      loader.register(errorPlugin);
      loader.register(successPlugin);

      const schema = createTestSchema();
      const result = await loader.run(schema, '/output');

      expect(result.files).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(successPlugin.generate).toHaveBeenCalled();
    });

    it('should run beforeGenerate hooks before generate', async () => {
      const callOrder: string[] = [];
      const plugin: Plugin = {
        name: 'hook-plugin',
        generate: vi.fn().mockImplementation(() => {
          callOrder.push('generate');
          return [];
        }),
        hooks: {
          beforeGenerate: vi.fn().mockImplementation(() => {
            callOrder.push('beforeGenerate');
          }),
        },
      };

      loader.register(plugin);

      const schema = createTestSchema();
      await loader.run(schema, '/output');

      expect(callOrder).toEqual(['beforeGenerate', 'generate']);
    });

    it('should run afterGenerate hooks in reverse order', async () => {
      const callOrder: string[] = [];

      const plugin1: Plugin = {
        name: 'plugin-1',
        generate: vi.fn().mockResolvedValue([{ path: 'a.ts', content: 'a' }]),
        hooks: {
          afterGenerate: vi.fn((_, files) => {
            callOrder.push('plugin-1');
            return files;
          }),
        },
      };

      const plugin2: Plugin = {
        name: 'plugin-2',
        generate: vi.fn().mockResolvedValue([{ path: 'b.ts', content: 'b' }]),
        hooks: {
          afterGenerate: vi.fn((_, files) => {
            callOrder.push('plugin-2');
            return files;
          }),
        },
      };

      loader.register(plugin1);
      loader.register(plugin2);

      const schema = createTestSchema();
      await loader.run(schema, '/output');

      // afterGenerate hooks should run in reverse order (plugin-2 first, then plugin-1)
      expect(callOrder).toEqual(['plugin-2', 'plugin-1']);
    });

    it('should allow afterGenerate to modify files', async () => {
      const plugin: Plugin = {
        name: 'modifier-plugin',
        generate: vi.fn().mockResolvedValue([{ path: 'test.ts', content: 'original' }]),
        hooks: {
          afterGenerate: vi.fn((_, files) => {
            return files.map((f) => ({ ...f, content: 'modified' }));
          }),
        },
      };

      loader.register(plugin);

      const schema = createTestSchema();
      const result = await loader.run(schema, '/output');

      expect(result.files[0].content).toBe('modified');
    });

    it('should collect errors from beforeGenerate hooks', async () => {
      const plugin: Plugin = {
        name: 'hook-error-plugin',
        generate: vi.fn().mockResolvedValue([]),
        hooks: {
          beforeGenerate: vi.fn().mockRejectedValue(new Error('Hook failed')),
        },
      };

      loader.register(plugin);

      const schema = createTestSchema();
      const result = await loader.run(schema, '/output');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Hook failed');
    });

    it('should collect errors from afterGenerate hooks', async () => {
      const plugin: Plugin = {
        name: 'after-hook-error-plugin',
        generate: vi.fn().mockResolvedValue([]),
        hooks: {
          afterGenerate: vi.fn().mockRejectedValue(new Error('After hook failed')),
        },
      };

      loader.register(plugin);

      const schema = createTestSchema();
      const result = await loader.run(schema, '/output');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('After hook failed');
    });

    it('should convert non-Error exceptions to Error objects', async () => {
      const plugin: Plugin = {
        name: 'string-error-plugin',
        generate: vi.fn().mockRejectedValue('string error'),
      };

      loader.register(plugin);

      const schema = createTestSchema();
      const result = await loader.run(schema, '/output');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toBeInstanceOf(Error);
      expect(result.errors[0].message).toBe('string error');
    });
  });

  describe('getPlugins', () => {
    it('should return readonly array of plugins', () => {
      const plugin = createTestPlugin('test');
      loader.register(plugin);

      const plugins = loader.getPlugins();
      expect(plugins).toBeInstanceOf(Array);
      expect(plugins).toHaveLength(1);
    });

    it('should return empty array when no plugins registered', () => {
      const plugins = loader.getPlugins();
      expect(plugins).toHaveLength(0);
    });
  });

  describe('clear', () => {
    it('should remove all registered plugins', () => {
      loader.register(createTestPlugin('plugin-1'));
      loader.register(createTestPlugin('plugin-2'));

      expect(loader.getPlugins()).toHaveLength(2);

      loader.clear();

      expect(loader.getPlugins()).toHaveLength(0);
    });

    it('should allow registering new plugins after clear', () => {
      const plugin1 = createTestPlugin('plugin-1');
      loader.register(plugin1);
      loader.clear();

      // Should not throw even though same name was used before
      const plugin2 = createTestPlugin('plugin-1');
      loader.register(plugin2);

      expect(loader.getPlugins()).toHaveLength(1);
    });
  });
});

describe('createPluginLoader', () => {
  it('should return a new PluginLoader instance', () => {
    const loader = createPluginLoader();
    expect(loader).toBeInstanceOf(PluginLoader);
  });

  it('should return independent instances', () => {
    const loader1 = createPluginLoader();
    const loader2 = createPluginLoader();

    loader1.register(createTestPlugin('test'));

    expect(loader1.getPlugins()).toHaveLength(1);
    expect(loader2.getPlugins()).toHaveLength(0);
  });
});
