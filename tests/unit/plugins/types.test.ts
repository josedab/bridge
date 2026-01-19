/**
 * Tests for plugin type guards and utilities
 */

import { describe, it, expect, vi } from 'vitest';
import {
  isPlugin,
  isPluginFactory,
  definePlugin,
} from '../../../src/plugins/types.js';
import type { Plugin, PluginFactory } from '../../../src/plugins/types.js';

describe('isPlugin', () => {
  it('should return true for valid plugin object', () => {
    const plugin: Plugin = {
      name: 'test-plugin',
      generate: vi.fn(),
    };

    expect(isPlugin(plugin)).toBe(true);
  });

  it('should return true for plugin with hooks', () => {
    const plugin: Plugin = {
      name: 'test-plugin',
      generate: vi.fn(),
      hooks: {
        beforeGenerate: vi.fn(),
        afterGenerate: vi.fn(),
      },
    };

    expect(isPlugin(plugin)).toBe(true);
  });

  it('should return false for null', () => {
    expect(isPlugin(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isPlugin(undefined)).toBe(false);
  });

  it('should return false for non-object values', () => {
    expect(isPlugin('string')).toBe(false);
    expect(isPlugin(123)).toBe(false);
    expect(isPlugin(true)).toBe(false);
    expect(isPlugin(Symbol('test'))).toBe(false);
  });

  it('should return false for object without name', () => {
    const invalid = {
      generate: vi.fn(),
    };

    expect(isPlugin(invalid)).toBe(false);
  });

  it('should return false for object without generate', () => {
    const invalid = {
      name: 'test',
    };

    expect(isPlugin(invalid)).toBe(false);
  });

  it('should return false when name is not a string', () => {
    const invalid = {
      name: 123,
      generate: vi.fn(),
    };

    expect(isPlugin(invalid)).toBe(false);
  });

  it('should return false when generate is not a function', () => {
    const invalid = {
      name: 'test',
      generate: 'not a function',
    };

    expect(isPlugin(invalid)).toBe(false);
  });

  it('should return false for empty object', () => {
    expect(isPlugin({})).toBe(false);
  });

  it('should return false for array', () => {
    expect(isPlugin([])).toBe(false);
  });

  it('should return false for function (plugin factory)', () => {
    const factory: PluginFactory = () => ({
      name: 'test',
      generate: vi.fn(),
    });

    expect(isPlugin(factory)).toBe(false);
  });
});

describe('isPluginFactory', () => {
  it('should return true for function', () => {
    const factory: PluginFactory = () => ({
      name: 'test',
      generate: vi.fn(),
    });

    expect(isPluginFactory(factory)).toBe(true);
  });

  it('should return true for arrow function', () => {
    const factory = (options?: Record<string, unknown>) => ({
      name: 'test',
      generate: () => [],
      options,
    });

    expect(isPluginFactory(factory)).toBe(true);
  });

  it('should return true for function expression', () => {
    const factory = function () {
      return {
        name: 'test',
        generate: () => [],
      };
    };

    expect(isPluginFactory(factory)).toBe(true);
  });

  it('should return false for non-function values', () => {
    expect(isPluginFactory(null)).toBe(false);
    expect(isPluginFactory(undefined)).toBe(false);
    expect(isPluginFactory('string')).toBe(false);
    expect(isPluginFactory(123)).toBe(false);
    expect(isPluginFactory({})).toBe(false);
    expect(isPluginFactory([])).toBe(false);
    expect(isPluginFactory(true)).toBe(false);
  });

  it('should return false for plugin object (not a factory)', () => {
    const plugin: Plugin = {
      name: 'test',
      generate: vi.fn(),
    };

    expect(isPluginFactory(plugin)).toBe(false);
  });
});

describe('definePlugin', () => {
  it('should return the same factory function', () => {
    const factory: PluginFactory = (options) => ({
      name: 'test',
      generate: () => [],
      options,
    });

    const defined = definePlugin(factory);

    expect(defined).toBe(factory);
  });

  it('should preserve type inference for options', () => {
    interface MyOptions {
      enabled: boolean;
      name: string;
    }

    const factory = definePlugin<MyOptions>((options) => ({
      name: 'typed-plugin',
      generate: () => [],
      options,
    }));

    // Call the factory to verify it works
    const plugin = factory({ enabled: true, name: 'test' });

    expect(plugin.name).toBe('typed-plugin');
    expect(isPlugin(plugin)).toBe(true);
  });

  it('should work with factory that returns async generate', () => {
    const factory = definePlugin(() => ({
      name: 'async-plugin',
      generate: async () => [],
    }));

    const plugin = factory();

    expect(plugin.name).toBe('async-plugin');
    expect(isPlugin(plugin)).toBe(true);
  });

  it('should work with factory that includes hooks', () => {
    const factory = definePlugin(() => ({
      name: 'hook-plugin',
      generate: () => [],
      hooks: {
        beforeGenerate: () => {},
        afterGenerate: (_, files) => files,
      },
    }));

    const plugin = factory();

    expect(plugin.hooks).toBeDefined();
    expect(plugin.hooks?.beforeGenerate).toBeDefined();
    expect(plugin.hooks?.afterGenerate).toBeDefined();
  });
});
