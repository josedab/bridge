/**
 * Built-in plugins that wrap existing generators
 */

export { bridgeTypescript, type TypeScriptPluginOptions } from './typescript.js';
export {
  bridgeTypescriptMultiFile,
  type MultiFileTypeScriptPluginOptions,
} from './typescript-multi.js';
export { bridgeZod, type ZodPluginOptions } from './zod.js';
export { bridgeClient, type ClientPluginOptions } from './client.js';
export { bridgeReactQuery, type ReactQueryPluginOptions } from './react-query.js';
export { bridgeSwr, type SwrPluginOptions } from './swr.js';
export { bridgeMsw, type MswPluginOptions } from './msw.js';
export { bridgeAuth, type AuthPluginOptions } from './auth.js';
export { bridgeApollo, type ApolloPluginOptions } from './apollo.js';
export { bridgeUrql, type UrqlPluginOptions } from './urql.js';
export { bridgeTanStackRouter, type TanStackRouterPluginOptions } from './tanstack-router.js';
