/**
 * Plugin system exports
 */

export { definePlugin, isPlugin, isPluginFactory } from './types.js';
export type {
  Plugin,
  PluginContext,
  PluginHooks,
  PluginFactory,
  PluginConfig,
  PluginRunResult,
} from './types.js';

export { PluginLoader, createPluginLoader } from './loader.js';

// Built-in plugins
export {
  bridgeTypescript,
  bridgeTypescriptMultiFile,
  bridgeZod,
  bridgeClient,
  bridgeReactQuery,
  bridgeSwr,
  bridgeMsw,
  bridgeAuth,
  bridgeApollo,
  bridgeUrql,
  bridgeTanStackRouter,
} from './builtin/index.js';

export type {
  TypeScriptPluginOptions,
  MultiFileTypeScriptPluginOptions,
  ZodPluginOptions,
  ClientPluginOptions,
  ReactQueryPluginOptions,
  SwrPluginOptions,
  MswPluginOptions,
  AuthPluginOptions,
  ApolloPluginOptions,
  UrqlPluginOptions,
  TanStackRouterPluginOptions,
} from './builtin/index.js';
