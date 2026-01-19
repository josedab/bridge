/**
 * SWR hook emitter - generates useSWR hooks
 */

import type { IREndpoint } from '../../ir/types.js';
import type { CodePrinter } from '../../codegen/printer.js';
import { pascalCase, camelCase } from '../../utils/naming.js';

/** Methods that typically represent queries (safe, idempotent) */
const QUERY_METHODS = ['get', 'head', 'options'];

/**
 * Hook emitter class for generating SWR hooks
 */
export class SwrHookEmitter {
  constructor(private printer: CodePrinter) {}

  /**
   * Generate SWR keys utilities
   */
  emitSwrKeys(endpoints: IREndpoint[]): void {
    this.printer.jsdoc(['SWR cache keys for revalidation']);
    this.printer.line('export const swrKeys = {');
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
  }

  /**
   * Generate a useSWR hook for a GET endpoint
   */
  emitSwrHook(endpoint: IREndpoint): void {
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

    // Generate hook
    if (hasParams) {
      this.printer.block(
        `export function ${hookName}(
  params: ${paramsType} | null,
  options?: SWRConfiguration<${responseType}, Error>
)`,
        () => {
          this.printer.line(`return useSWR<${responseType}, Error>(`);
          this.printer.indent();
          this.printer.line(`params ? swrKeys.${keyName}(params) : null,`);
          this.printer.line(`params ? () => apiClient.${clientMethod}(params) : null,`);
          this.printer.line('options');
          this.printer.dedent();
          this.printer.line(');');
        }
      );
    } else {
      this.printer.block(
        `export function ${hookName}(
  options?: SWRConfiguration<${responseType}, Error>
)`,
        () => {
          this.printer.line(`return useSWR<${responseType}, Error>(`);
          this.printer.indent();
          this.printer.line(`swrKeys.${keyName},`);
          this.printer.line(`() => apiClient.${clientMethod}(undefined as void),`);
          this.printer.line('options');
          this.printer.dedent();
          this.printer.line(');');
        }
      );
    }
    this.printer.blank();
  }

  /**
   * Generate a useSWRImmutable hook for a GET endpoint
   */
  emitSwrImmutableHook(endpoint: IREndpoint): void {
    const hookName = `use${pascalCase(endpoint.operationId)}Immutable`;
    const paramsType = `${pascalCase(endpoint.operationId)}Params`;
    const responseType = `${pascalCase(endpoint.operationId)}Response`;
    const keyName = camelCase(endpoint.operationId);
    const clientMethod = camelCase(endpoint.operationId);

    const hasParams = this.hasParams(endpoint);

    if (hasParams) {
      this.printer.block(
        `export function ${hookName}(
  params: ${paramsType} | null,
  options?: SWRConfiguration<${responseType}, Error>
)`,
        () => {
          this.printer.line(`return useSWRImmutable<${responseType}, Error>(`);
          this.printer.indent();
          this.printer.line(`params ? swrKeys.${keyName}(params) : null,`);
          this.printer.line(`params ? () => apiClient.${clientMethod}(params) : null,`);
          this.printer.line('options');
          this.printer.dedent();
          this.printer.line(');');
        }
      );
    } else {
      this.printer.block(
        `export function ${hookName}(
  options?: SWRConfiguration<${responseType}, Error>
)`,
        () => {
          this.printer.line(`return useSWRImmutable<${responseType}, Error>(`);
          this.printer.indent();
          this.printer.line(`swrKeys.${keyName},`);
          this.printer.line(`() => apiClient.${clientMethod}(undefined as void),`);
          this.printer.line('options');
          this.printer.dedent();
          this.printer.line(');');
        }
      );
    }
    this.printer.blank();
  }

  /**
   * Generate a useSWRMutation hook for a mutation endpoint
   */
  emitSwrMutationHook(endpoint: IREndpoint): void {
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
  options?: SWRMutationConfiguration<${responseType}, Error, string, ${paramsType}>
)`,
      () => {
        this.printer.line(`return useSWRMutation<${responseType}, Error, string, ${paramsType}>(`);
        this.printer.indent();
        this.printer.line(`'${endpoint.operationId}',`);
        this.printer.line(`(_, { arg }) => apiClient.${clientMethod}(arg),`);
        this.printer.line('options');
        this.printer.dedent();
        this.printer.line(');');
      }
    );
    this.printer.blank();
  }

  /**
   * Generate an infinite SWR hook
   */
  emitSwrInfiniteHook(endpoint: IREndpoint): void {
    const hookName = `use${pascalCase(endpoint.operationId)}Infinite`;
    const paramsType = `${pascalCase(endpoint.operationId)}Params`;
    const responseType = `${pascalCase(endpoint.operationId)}Response`;
    const keyName = camelCase(endpoint.operationId);
    const clientMethod = camelCase(endpoint.operationId);

    this.printer.block(
      `export function ${hookName}(
  getParams: (pageIndex: number, previousPageData: ${responseType} | null) => ${paramsType} | null,
  options?: SWRInfiniteConfiguration<${responseType}, Error>
)`,
      () => {
        this.printer.line(`return useSWRInfinite<${responseType}, Error>(`);
        this.printer.indent();
        this.printer.line('(pageIndex, previousPageData) => {');
        this.printer.indent();
        this.printer.line('const params = getParams(pageIndex, previousPageData);');
        this.printer.line('if (!params) return null;');
        this.printer.line(`return [...swrKeys.${keyName}(params), pageIndex];`);
        this.printer.dedent();
        this.printer.line('},');
        this.printer.line('(key) => {');
        this.printer.indent();
        this.printer.line(`const params = key[1] as ${paramsType};`);
        this.printer.line(`return apiClient.${clientMethod}(params);`);
        this.printer.dedent();
        this.printer.line('},');
        this.printer.line('options');
        this.printer.dedent();
        this.printer.line(');');
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
