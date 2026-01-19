/**
 * Bridge - Type-safe API client generator
 *
 * @packageDocumentation
 */

// Core IR types
export * from './ir/index.js';

// Parsers
export * from './parsers/index.js';

// Generators
export * from './generators/index.js';

// Utilities
export { defineConfig, type BridgeConfig, type GeneratorsConfig } from './cli/config.js';
export * from './errors.js';

// Codegen utilities
export { CodePrinter, createPrinter } from './codegen/printer.js';
export { formatCode, type FormatConfig } from './codegen/formatter.js';

// Plugin system
export * from './plugins/index.js';
