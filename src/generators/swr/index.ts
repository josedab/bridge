/**
 * SWR hooks generator
 */

import type { IRSchema, IREndpoint } from '../../ir/types.js';
import { BaseGenerator, type GeneratorOptions } from '../base.js';
import { SwrHookEmitter } from './hook-emitter.js';
import { pascalCase } from '../../utils/naming.js';

export { SwrHookEmitter } from './hook-emitter.js';

/** SWR generator options */
export interface SwrGeneratorOptions extends GeneratorOptions {
  /** Generate immutable hooks (useSWRImmutable) */
  immutable?: boolean;
  /** Generate infinite hooks (useSWRInfinite) for paginated endpoints */
  infinite?: boolean;
}

/**
 * SWR hooks generator
 */
export class SwrGenerator extends BaseGenerator {
  declare protected options: SwrGeneratorOptions;
  private hookEmitter!: SwrHookEmitter;

  constructor(schema: IRSchema, options: SwrGeneratorOptions) {
    super(schema, options);
  }

  get name(): string {
    return 'SWR hooks';
  }

  get filename(): string {
    return 'hooks.ts';
  }

  generate(): void {
    this.addHeader();

    // Generate imports
    this.generateImports();

    // Create hook emitter
    this.hookEmitter = new SwrHookEmitter(this.printer);

    // Generate SWR keys
    this.hookEmitter.emitSwrKeys(this.schema.endpoints);

    // Generate hooks for each endpoint
    this.generateHooks();
  }

  /**
   * Generate import statements
   */
  private generateImports(): void {
    // SWR imports
    const swrImports = ['useSWR', 'SWRConfiguration'];

    if (this.options.immutable) {
      swrImports.push('useSWRImmutable');
    }

    if (this.options.infinite) {
      swrImports.push('useSWRInfinite', 'SWRInfiniteConfiguration');
    }

    this.printer.import(swrImports, 'swr');

    // Import mutation hook
    this.printer.import(['useSWRMutation', 'SWRMutationConfiguration'], 'swr/mutation');
    this.printer.blank();

    // Import client
    this.printer.import('apiClient', './client.js');
    this.printer.blank();

    // Import types
    const types: string[] = [];
    for (const endpoint of this.schema.endpoints) {
      types.push(`${pascalCase(endpoint.operationId)}Params`);
      types.push(`${pascalCase(endpoint.operationId)}Response`);
    }

    if (types.length > 0) {
      this.printer.importType(types, './types.js');
    }

    this.printer.blank();
  }

  /**
   * Generate hooks for all endpoints
   */
  private generateHooks(): void {
    this.printer.comment('=== SWR Query Hooks ===');
    this.printer.blank();

    // Generate query hooks (GET endpoints)
    const queryEndpoints = this.schema.endpoints.filter((e) => this.hookEmitter.isQuery(e));

    for (const endpoint of queryEndpoints) {
      this.hookEmitter.emitSwrHook(endpoint);

      if (this.options.immutable) {
        this.hookEmitter.emitSwrImmutableHook(endpoint);
      }

      if (this.options.infinite && this.isPaginatedEndpoint(endpoint)) {
        this.hookEmitter.emitSwrInfiniteHook(endpoint);
      }
    }

    this.printer.comment('=== SWR Mutation Hooks ===');
    this.printer.blank();

    // Generate mutation hooks (POST, PUT, PATCH, DELETE endpoints)
    const mutationEndpoints = this.schema.endpoints.filter((e) => !this.hookEmitter.isQuery(e));

    for (const endpoint of mutationEndpoints) {
      this.hookEmitter.emitSwrMutationHook(endpoint);
    }
  }

  /**
   * Check if an endpoint appears to be paginated
   */
  private isPaginatedEndpoint(endpoint: IREndpoint): boolean {
    const paginationParams = ['page', 'offset', 'cursor', 'limit', 'pageSize'];
    return endpoint.parameters.some((p) => paginationParams.includes(p.name.toLowerCase()));
  }
}

/**
 * Create a new SWR generator
 */
export function createSwrGenerator(schema: IRSchema, options: SwrGeneratorOptions): SwrGenerator {
  return new SwrGenerator(schema, options);
}
