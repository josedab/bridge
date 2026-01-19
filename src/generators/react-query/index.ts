/**
 * React Query hooks generator
 */

import type { IRSchema, IREndpoint } from '../../ir/types.js';
import { BaseGenerator, type GeneratorOptions } from '../base.js';
import { HookEmitter } from './hook-emitter.js';
import { pascalCase } from '../../utils/naming.js';

export { HookEmitter } from './hook-emitter.js';

/** React Query generator options */
export interface ReactQueryGeneratorOptions extends GeneratorOptions {
  /** Generate suspense query hooks */
  suspense?: boolean;
  /** Generate infinite query hooks for paginated endpoints */
  infinite?: boolean;
  /** Version of React Query (affects imports) */
  version?: 5;
}

/**
 * React Query hooks generator
 */
export class ReactQueryGenerator extends BaseGenerator {
  declare protected options: ReactQueryGeneratorOptions;
  private hookEmitter!: HookEmitter;

  constructor(schema: IRSchema, options: ReactQueryGeneratorOptions) {
    super(schema, options);
  }

  get name(): string {
    return 'React Query hooks';
  }

  get filename(): string {
    return 'hooks.ts';
  }

  generate(): void {
    this.addHeader();

    // Generate imports
    this.generateImports();

    // Create hook emitter
    this.hookEmitter = new HookEmitter(this.printer);

    // Generate query keys
    this.hookEmitter.emitQueryKeys(this.schema.endpoints);

    // Generate hooks for each endpoint
    this.generateHooks();
  }

  /**
   * Generate import statements
   */
  private generateImports(): void {
    // React Query imports
    const reactQueryImports = ['useQuery', 'useMutation', 'UseQueryOptions', 'UseMutationOptions'];

    if (this.options.suspense) {
      reactQueryImports.push('useSuspenseQuery', 'UseSuspenseQueryOptions');
    }

    if (this.options.infinite) {
      reactQueryImports.push('useInfiniteQuery', 'UseInfiniteQueryOptions');
    }

    this.printer.import(reactQueryImports, '@tanstack/react-query');
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
    this.printer.comment('=== Query Hooks ===');
    this.printer.blank();

    // Generate query hooks (GET endpoints)
    const queryEndpoints = this.schema.endpoints.filter((e) => this.hookEmitter.isQuery(e));

    for (const endpoint of queryEndpoints) {
      this.hookEmitter.emitQueryHook(endpoint);

      if (this.options.suspense) {
        this.hookEmitter.emitSuspenseQueryHook(endpoint);
      }

      if (this.options.infinite && this.isPaginatedEndpoint(endpoint)) {
        this.hookEmitter.emitInfiniteQueryHook(endpoint);
      }
    }

    this.printer.comment('=== Mutation Hooks ===');
    this.printer.blank();

    // Generate mutation hooks (POST, PUT, PATCH, DELETE endpoints)
    const mutationEndpoints = this.schema.endpoints.filter((e) => !this.hookEmitter.isQuery(e));

    for (const endpoint of mutationEndpoints) {
      this.hookEmitter.emitMutationHook(endpoint);
    }
  }

  /**
   * Check if an endpoint appears to be paginated
   */
  private isPaginatedEndpoint(endpoint: IREndpoint): boolean {
    // Check for common pagination parameters
    const paginationParams = ['page', 'offset', 'cursor', 'limit', 'pageSize'];
    return endpoint.parameters.some((p) => paginationParams.includes(p.name.toLowerCase()));
  }
}

/**
 * Create a new React Query generator
 */
export function createReactQueryGenerator(
  schema: IRSchema,
  options: ReactQueryGeneratorOptions
): ReactQueryGenerator {
  return new ReactQueryGenerator(schema, options);
}
