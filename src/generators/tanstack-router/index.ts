/**
 * TanStack Router integration generator
 * Generates type-safe route loaders and utilities for TanStack Router
 */

import type { IRSchema, IREndpoint } from '../../ir/types.js';
import { BaseGenerator, type GeneratorOptions } from '../base.js';
import { pascalCase, camelCase } from '../../utils/naming.js';
import { logger } from '../../utils/logger.js';

export interface TanStackRouterGeneratorOptions extends GeneratorOptions {
  /** Generate React Query integration for loaders */
  withReactQuery?: boolean;
  /** Generate route definitions */
  generateRoutes?: boolean;
}

/**
 * TanStack Router loaders generator
 */
export class TanStackRouterGenerator extends BaseGenerator {
  declare protected options: TanStackRouterGeneratorOptions;

  constructor(schema: IRSchema, options: TanStackRouterGeneratorOptions) {
    super(schema, options);
  }

  get name(): string {
    return 'TanStack Router loaders';
  }

  get filename(): string {
    return 'loaders.ts';
  }

  generate(): void {
    if (this.schema.endpoints.length === 0) {
      logger.warn('No endpoints found in schema');
      this.printer.comment('No endpoints defined');
      return;
    }

    this.addHeader();
    this.generateImports();
    this.printer.blank();

    // Generate route param types
    this.generateRouteParamTypes();
    this.printer.blank();

    // Generate loaders for GET endpoints (routes typically load data)
    this.generateLoaders();

    // Generate route definitions if requested
    if (this.options.generateRoutes) {
      this.printer.blank();
      this.generateRouteDefinitions();
    }
  }

  /**
   * Generate import statements
   */
  private generateImports(): void {
    // TanStack Router types
    this.printer.importType('LoaderFnContext', '@tanstack/react-router');

    if (this.options.withReactQuery) {
      this.printer.import('QueryClient', '@tanstack/react-query');
      this.printer.blank();
      this.printer.comment('Import from your generated files');
      this.printer.import('apiClient', './client.js');
      this.printer.import('queryKeys', './query-keys.js');
    } else {
      this.printer.blank();
      this.printer.comment('Import from your generated files');
      this.printer.import('apiClient', './client.js');
    }

    this.printer.blank();

    // Import endpoint param types
    const typeImports: string[] = [];
    for (const endpoint of this.schema.endpoints) {
      if (this.hasPathParams(endpoint)) {
        typeImports.push(`${pascalCase(endpoint.operationId)}Params`);
      }
    }

    if (typeImports.length > 0) {
      this.printer.importType(typeImports, './types.js');
    }
  }

  /**
   * Generate route parameter types
   */
  private generateRouteParamTypes(): void {
    this.printer.comment('=== Route Parameter Types ===');
    this.printer.blank();

    const endpointsWithPathParams = this.schema.endpoints.filter((e) => this.hasPathParams(e));

    for (const endpoint of endpointsWithPathParams) {
      const pathParams = endpoint.parameters.filter((p) => p.in === 'path');
      const typeName = `${pascalCase(endpoint.operationId)}RouteParams`;

      this.printer.jsdoc([`Route params for ${endpoint.path}`]);
      this.printer.interface(typeName, () => {
        for (const param of pathParams) {
          // Route params are always strings in URLs
          this.printer.line(`${param.name}: string;`);
        }
      });
      this.printer.blank();
    }
  }

  /**
   * Generate loader functions
   */
  private generateLoaders(): void {
    this.printer.comment('=== Route Loaders ===');
    this.printer.blank();

    // Only generate loaders for GET endpoints (data fetching)
    const getEndpoints = this.schema.endpoints.filter((e) => e.method === 'get');

    if (this.options.withReactQuery) {
      // Generate a query client parameter for loaders
      this.printer.jsdoc([
        'Create loaders with a QueryClient instance',
        'Use this to create route loaders that integrate with React Query',
      ]);
      this.printer.func(
        'createLoaders',
        'queryClient: QueryClient',
        'ReturnType<typeof createLoadersImpl>',
        () => {
          this.printer.line('return createLoadersImpl(queryClient);');
        }
      );
      this.printer.blank();

      // Generate the implementation function
      this.printer.line('function createLoadersImpl(queryClient: QueryClient) {');
      this.printer.indent();
      this.printer.line('return {');
      this.printer.indent();

      for (const endpoint of getEndpoints) {
        this.generateReactQueryLoader(endpoint);
      }

      this.printer.dedent();
      this.printer.line('};');
      this.printer.dedent();
      this.printer.line('}');
    } else {
      // Generate standalone loaders
      for (const endpoint of getEndpoints) {
        this.generateStandaloneLoader(endpoint);
        this.printer.blank();
      }
    }
  }

  /**
   * Generate a loader that integrates with React Query
   */
  private generateReactQueryLoader(endpoint: IREndpoint): void {
    const loaderName = `${camelCase(endpoint.operationId)}Loader`;
    const hasPathParams = this.hasPathParams(endpoint);
    const routeParamsType = hasPathParams
      ? `${pascalCase(endpoint.operationId)}RouteParams`
      : 'Record<string, never>';

    this.printer.jsdoc(
      [
        `Loader for ${endpoint.method.toUpperCase()} ${endpoint.path}`,
        endpoint.summary || '',
      ].filter(Boolean)
    );

    this.printer.line(
      `${loaderName}: async ({ params }: LoaderFnContext<${routeParamsType}>) => {`
    );
    this.printer.indent();

    // Build the query parameters
    if (hasPathParams) {
      const pathParams = endpoint.parameters.filter((p) => p.in === 'path');
      this.printer.line('const queryParams = {');
      this.printer.indent();
      this.printer.line('path: {');
      this.printer.indent();
      for (const param of pathParams) {
        this.printer.line(`${param.name}: params.${param.name},`);
      }
      this.printer.dedent();
      this.printer.line('},');
      this.printer.dedent();
      this.printer.line('};');
      this.printer.blank();

      this.printer.line('return queryClient.ensureQueryData({');
      this.printer.indent();
      this.printer.line(`queryKey: queryKeys.${camelCase(endpoint.operationId)}(queryParams),`);
      this.printer.line(
        `queryFn: () => apiClient.${camelCase(endpoint.operationId)}(queryParams),`
      );
      this.printer.dedent();
      this.printer.line('});');
    } else {
      this.printer.line('return queryClient.ensureQueryData({');
      this.printer.indent();
      this.printer.line(`queryKey: queryKeys.${camelCase(endpoint.operationId)}(),`);
      this.printer.line(`queryFn: () => apiClient.${camelCase(endpoint.operationId)}(),`);
      this.printer.dedent();
      this.printer.line('});');
    }

    this.printer.dedent();
    this.printer.line('},');
    this.printer.blank();
  }

  /**
   * Generate a standalone loader (without React Query)
   */
  private generateStandaloneLoader(endpoint: IREndpoint): void {
    const loaderName = `${camelCase(endpoint.operationId)}Loader`;
    const hasPathParams = this.hasPathParams(endpoint);
    const routeParamsType = hasPathParams
      ? `${pascalCase(endpoint.operationId)}RouteParams`
      : 'Record<string, never>';
    const responseType = `${pascalCase(endpoint.operationId)}Response`;

    this.printer.jsdoc(
      [
        `Loader for ${endpoint.method.toUpperCase()} ${endpoint.path}`,
        endpoint.summary || '',
      ].filter(Boolean)
    );

    this.printer.func(
      loaderName,
      `{ params }: LoaderFnContext<${routeParamsType}>`,
      `Promise<${responseType}>`,
      () => {
        if (hasPathParams) {
          const pathParams = endpoint.parameters.filter((p) => p.in === 'path');
          this.printer.line('return apiClient.' + camelCase(endpoint.operationId) + '({');
          this.printer.indent();
          this.printer.line('path: {');
          this.printer.indent();
          for (const param of pathParams) {
            this.printer.line(`${param.name}: params.${param.name},`);
          }
          this.printer.dedent();
          this.printer.line('},');
          this.printer.dedent();
          this.printer.line('});');
        } else {
          this.printer.line(`return apiClient.${camelCase(endpoint.operationId)}();`);
        }
      }
    );
  }

  /**
   * Generate route definitions
   */
  private generateRouteDefinitions(): void {
    this.printer.comment('=== Route Definitions ===');
    this.printer.blank();

    this.printer.jsdoc(['Route paths derived from API endpoints']);
    this.printer.line('export const routePaths = {');
    this.printer.indent();

    for (const endpoint of this.schema.endpoints) {
      // Convert OpenAPI path to TanStack Router path format
      const routerPath = this.convertPathToRouterFormat(endpoint.path);
      this.printer.line(`${camelCase(endpoint.operationId)}: '${routerPath}' as const,`);
    }

    this.printer.dedent();
    this.printer.line('} as const;');
    this.printer.blank();

    // Generate path param type utilities
    this.printer.jsdoc(['Utility type to extract params from a route path']);
    this.printer.line(
      'export type ExtractRouteParams<T extends string> = T extends `${string}$${infer Param}/${infer Rest}`'
    );
    this.printer.indent();
    this.printer.line('? { [K in Param]: string } & ExtractRouteParams<Rest>');
    this.printer.line(': T extends `${string}$${infer Param}`');
    this.printer.line('? { [K in Param]: string }');
    this.printer.line(': Record<string, never>;');
    this.printer.dedent();
  }

  /**
   * Check if endpoint has path parameters
   */
  private hasPathParams(endpoint: IREndpoint): boolean {
    return endpoint.parameters.some((p) => p.in === 'path');
  }

  /**
   * Convert OpenAPI path format to TanStack Router format
   * e.g., /pets/{petId} -> /pets/$petId
   */
  private convertPathToRouterFormat(path: string): string {
    return path.replace(/\{(\w+)\}/g, '$$$1');
  }
}

/**
 * Create a new TanStack Router generator
 */
export function createTanStackRouterGenerator(
  schema: IRSchema,
  options: TanStackRouterGeneratorOptions
): TanStackRouterGenerator {
  return new TanStackRouterGenerator(schema, options);
}
