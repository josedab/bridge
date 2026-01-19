/**
 * React Query hook emitter - generates useQuery and useMutation hooks
 */

import type { IREndpoint } from '../../ir/types.js';
import type { CodePrinter } from '../../codegen/printer.js';
import { pascalCase, camelCase } from '../../utils/naming.js';

/** Methods that typically represent queries (safe, idempotent) */
const QUERY_METHODS = ['get', 'head', 'options'];

/**
 * Hook emitter class for generating React Query hooks
 */
export class HookEmitter {
  constructor(private printer: CodePrinter) {}

  /**
   * Generate query keys object
   */
  emitQueryKeys(endpoints: IREndpoint[]): void {
    this.printer.jsdoc(['Query keys for cache management and invalidation']);
    this.printer.line('export const queryKeys = {');
    this.printer.indent();

    for (const endpoint of endpoints) {
      if (!this.isQuery(endpoint)) continue;

      const keyName = camelCase(endpoint.operationId);
      const hasParams = this.hasParams(endpoint);

      if (hasParams) {
        const paramsType = `${pascalCase(endpoint.operationId)}Params`;
        this.printer.line(
          `${keyName}: (params: ${paramsType}) => ['${endpoint.operationId}', params] as const,`
        );
      } else {
        this.printer.line(`${keyName}: ['${endpoint.operationId}'] as const,`);
      }
    }

    this.printer.dedent();
    this.printer.line('} as const;');
    this.printer.blank();

    // Generate QueryKeys type
    this.printer.line('export type QueryKeys = typeof queryKeys;');
    this.printer.blank();
  }

  /**
   * Generate a useQuery hook for a GET endpoint
   */
  emitQueryHook(endpoint: IREndpoint): void {
    const hookName = `use${pascalCase(endpoint.operationId)}`;
    const paramsType = `${pascalCase(endpoint.operationId)}Params`;
    const responseType = `${pascalCase(endpoint.operationId)}Response`;
    const keyName = camelCase(endpoint.operationId);
    const clientMethod = camelCase(endpoint.operationId);

    const hasParams = this.hasParams(endpoint);

    // Add JSDoc
    const jsdocLines: string[] = [];
    if (endpoint.summary) {
      jsdocLines.push(endpoint.summary);
    }
    if (endpoint.deprecated) {
      jsdocLines.push('@deprecated');
    }
    if (jsdocLines.length > 0) {
      this.printer.jsdoc(jsdocLines);
    }

    // Generate hook signature
    if (hasParams) {
      this.printer.block(
        `export function ${hookName}(
  params: ${paramsType},
  options?: Omit<UseQueryOptions<${responseType}, Error>, 'queryKey' | 'queryFn'>
)`,
        () => {
          this.printer.line('return useQuery({');
          this.printer.indent();
          this.printer.line(`queryKey: queryKeys.${keyName}(params),`);
          this.printer.line(`queryFn: ({ signal }) => apiClient.${clientMethod}(params, signal),`);
          this.printer.line('...options,');
          this.printer.dedent();
          this.printer.line('});');
        }
      );
    } else {
      this.printer.block(
        `export function ${hookName}(
  options?: Omit<UseQueryOptions<${responseType}, Error>, 'queryKey' | 'queryFn'>
)`,
        () => {
          this.printer.line('return useQuery({');
          this.printer.indent();
          this.printer.line(`queryKey: queryKeys.${keyName},`);
          this.printer.line(
            `queryFn: ({ signal }) => apiClient.${clientMethod}(undefined as void, signal),`
          );
          this.printer.line('...options,');
          this.printer.dedent();
          this.printer.line('});');
        }
      );
    }
    this.printer.blank();
  }

  /**
   * Generate a useSuspenseQuery hook for a GET endpoint
   */
  emitSuspenseQueryHook(endpoint: IREndpoint): void {
    const hookName = `use${pascalCase(endpoint.operationId)}Suspense`;
    const paramsType = `${pascalCase(endpoint.operationId)}Params`;
    const responseType = `${pascalCase(endpoint.operationId)}Response`;
    const keyName = camelCase(endpoint.operationId);
    const clientMethod = camelCase(endpoint.operationId);

    const hasParams = this.hasParams(endpoint);

    if (hasParams) {
      this.printer.block(
        `export function ${hookName}(
  params: ${paramsType},
  options?: Omit<UseSuspenseQueryOptions<${responseType}, Error>, 'queryKey' | 'queryFn'>
)`,
        () => {
          this.printer.line('return useSuspenseQuery({');
          this.printer.indent();
          this.printer.line(`queryKey: queryKeys.${keyName}(params),`);
          this.printer.line(`queryFn: ({ signal }) => apiClient.${clientMethod}(params, signal),`);
          this.printer.line('...options,');
          this.printer.dedent();
          this.printer.line('});');
        }
      );
    } else {
      this.printer.block(
        `export function ${hookName}(
  options?: Omit<UseSuspenseQueryOptions<${responseType}, Error>, 'queryKey' | 'queryFn'>
)`,
        () => {
          this.printer.line('return useSuspenseQuery({');
          this.printer.indent();
          this.printer.line(`queryKey: queryKeys.${keyName},`);
          this.printer.line(
            `queryFn: ({ signal }) => apiClient.${clientMethod}(undefined as void, signal),`
          );
          this.printer.line('...options,');
          this.printer.dedent();
          this.printer.line('});');
        }
      );
    }
    this.printer.blank();
  }

  /**
   * Generate a useMutation hook for a mutation endpoint
   */
  emitMutationHook(endpoint: IREndpoint): void {
    const hookName = `use${pascalCase(endpoint.operationId)}`;
    const paramsType = `${pascalCase(endpoint.operationId)}Params`;
    const responseType = `${pascalCase(endpoint.operationId)}Response`;
    const clientMethod = camelCase(endpoint.operationId);

    // Add JSDoc
    const jsdocLines: string[] = [];
    if (endpoint.summary) {
      jsdocLines.push(endpoint.summary);
    }
    if (endpoint.deprecated) {
      jsdocLines.push('@deprecated');
    }
    if (jsdocLines.length > 0) {
      this.printer.jsdoc(jsdocLines);
    }

    this.printer.block(
      `export function ${hookName}(
  options?: UseMutationOptions<${responseType}, Error, ${paramsType}>
)`,
      () => {
        this.printer.line('return useMutation({');
        this.printer.indent();
        this.printer.line(`mutationFn: (params) => apiClient.${clientMethod}(params),`);
        this.printer.line('...options,');
        this.printer.dedent();
        this.printer.line('});');
      }
    );
    this.printer.blank();
  }

  /**
   * Generate an infinite query hook
   */
  emitInfiniteQueryHook(endpoint: IREndpoint): void {
    const hookName = `use${pascalCase(endpoint.operationId)}Infinite`;
    const paramsType = `${pascalCase(endpoint.operationId)}Params`;
    const responseType = `${pascalCase(endpoint.operationId)}Response`;
    const keyName = camelCase(endpoint.operationId);
    const clientMethod = camelCase(endpoint.operationId);

    this.printer.block(
      `export function ${hookName}(
  params: ${paramsType},
  options?: Omit<UseInfiniteQueryOptions<${responseType}, Error>, 'queryKey' | 'queryFn'>
)`,
      () => {
        this.printer.line('return useInfiniteQuery({');
        this.printer.indent();
        this.printer.line(`queryKey: queryKeys.${keyName}(params),`);
        this.printer.line(
          `queryFn: ({ signal, pageParam }) => apiClient.${clientMethod}({ ...params, query: { ...params.query, page: pageParam as number } }, signal),`
        );
        this.printer.line('initialPageParam: 1,');
        this.printer.line('getNextPageParam: (lastPage, allPages) => allPages.length + 1,');
        this.printer.line('...options,');
        this.printer.dedent();
        this.printer.line('});');
      }
    );
    this.printer.blank();
  }

  /**
   * Check if an endpoint is a query (GET, HEAD, OPTIONS)
   */
  isQuery(endpoint: IREndpoint): boolean {
    return QUERY_METHODS.includes(endpoint.method);
  }

  /**
   * Check if an endpoint has parameters
   */
  private hasParams(endpoint: IREndpoint): boolean {
    return endpoint.parameters.length > 0 || endpoint.requestBody !== undefined;
  }
}
