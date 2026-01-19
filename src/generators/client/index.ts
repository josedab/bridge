/**
 * HTTP client generator
 */

import type { IRSchema, IREndpoint } from '../../ir/types.js';
import { BaseGenerator, type GeneratorOptions } from '../base.js';
import { generateFetchClientBase } from './fetch-client.js';
import { pascalCase, camelCase } from '../../utils/naming.js';

export { generateFetchClientBase } from './fetch-client.js';

/** Client generator options */
export interface ClientGeneratorOptions extends GeneratorOptions {
  /** Base URL for the API */
  baseUrl?: string;
  /** Generate individual functions or a class */
  style?: 'functions' | 'class';
  /** Include Zod runtime validation */
  includeValidation?: boolean;
}

/**
 * HTTP client generator
 */
export class ClientGenerator extends BaseGenerator {
  declare protected options: ClientGeneratorOptions;

  constructor(schema: IRSchema, options: ClientGeneratorOptions) {
    super(schema, options);
  }

  get name(): string {
    return 'HTTP client';
  }

  get filename(): string {
    return 'client.ts';
  }

  generate(): void {
    this.addHeader();

    // Import types
    this.generateImports();

    // Generate base client
    generateFetchClientBase(this.printer, this.options.baseUrl ?? this.schema.metadata.baseUrl);

    // Generate API client
    if (this.options.style === 'functions') {
      this.generateClientFunctions();
    } else {
      this.generateClientClass();
    }
  }

  /**
   * Generate import statements
   */
  private generateImports(): void {
    // Collect all types used in endpoints
    const usedTypes = new Set<string>();

    for (const endpoint of this.schema.endpoints) {
      usedTypes.add(`${pascalCase(endpoint.operationId)}Params`);
      usedTypes.add(`${pascalCase(endpoint.operationId)}Response`);
    }

    if (usedTypes.size > 0) {
      this.printer.importType(Array.from(usedTypes), './types.js');
    }

    if (this.options.includeValidation) {
      const schemaNames = this.schema.endpoints.map(
        (e) => `${camelCase(e.operationId)}ResponseSchema`
      );
      this.printer.import(schemaNames, './schemas.js');
    }

    this.printer.blank();
  }

  /**
   * Generate client as a class
   */
  private generateClientClass(): void {
    this.printer.jsdoc(['API client for making typed requests']);

    this.printer.block('export class ApiClient', () => {
      this.printer.line('private http: HttpClient;');
      this.printer.blank();

      // Constructor
      this.printer.block('constructor(config?: Partial<ClientConfig>)', () => {
        this.printer.line('this.http = new HttpClient(config);');
      });
      this.printer.blank();

      // Generate method for each endpoint
      for (const endpoint of this.schema.endpoints) {
        this.generateClientMethod(endpoint);
      }
    });
    this.printer.blank();

    // Export default instance
    this.printer.jsdoc(['Default API client instance']);
    this.printer.line('export const apiClient = new ApiClient();');
  }

  /**
   * Generate a client method for an endpoint
   */
  private generateClientMethod(endpoint: IREndpoint): void {
    const methodName = camelCase(endpoint.operationId);
    const paramsType = `${pascalCase(endpoint.operationId)}Params`;
    const responseType = `${pascalCase(endpoint.operationId)}Response`;

    // Determine if params are required
    const hasRequiredParams = this.hasRequiredParams(endpoint);
    const paramsOptional = hasRequiredParams ? '' : '?';

    // Add JSDoc
    const jsdocLines: string[] = [];
    if (endpoint.summary) {
      jsdocLines.push(endpoint.summary);
    }
    if (endpoint.description) {
      jsdocLines.push('', endpoint.description);
    }
    if (endpoint.deprecated) {
      jsdocLines.push('@deprecated');
    }

    if (jsdocLines.length > 0) {
      this.printer.jsdoc(jsdocLines);
    }

    // Generate method signature
    const paramsArg = `params${paramsOptional}: ${paramsType}`;
    const signalArg = 'signal?: AbortSignal';

    this.printer.block(
      `async ${methodName}(${paramsArg}, ${signalArg}): Promise<${responseType}>`,
      () => {
        this.generateMethodBody(endpoint);
      }
    );
    this.printer.blank();
  }

  /**
   * Generate method body
   */
  private generateMethodBody(endpoint: IREndpoint): void {
    const method = endpoint.method.toUpperCase();
    const hasPath = endpoint.parameters.some((p) => p.in === 'path');
    const hasQuery = endpoint.parameters.some((p) => p.in === 'query');
    const hasHeaders = endpoint.parameters.some((p) => p.in === 'header');
    const hasBody = endpoint.requestBody !== undefined;

    // Build path with params
    let pathExpr: string;
    if (hasPath) {
      const pathWithTemplate = endpoint.path.replace(/\{([^}]+)\}/g, '${params.path.$1}');
      pathExpr = `\`${pathWithTemplate}\``;
    } else {
      pathExpr = `'${endpoint.path}'`;
    }

    // Build options object
    this.printer.line('const options: RequestOptions = {');
    this.printer.indent();

    if (hasQuery) {
      this.printer.line('query: params?.query,');
    }

    if (hasHeaders) {
      this.printer.line('headers: params?.headers as Record<string, string>,');
    }

    if (hasBody) {
      this.printer.line('body: params?.body,');
    }

    this.printer.line('signal,');
    this.printer.dedent();
    this.printer.line('};');
    this.printer.blank();

    // Make the request
    const responseType = `${pascalCase(endpoint.operationId)}Response`;

    if (this.options.includeValidation) {
      const schemaName = `${camelCase(endpoint.operationId)}ResponseSchema`;
      this.printer.line(
        `const data = await this.http.request<unknown>('${method}', ${pathExpr}, options);`
      );
      this.printer.line(`return ${schemaName}.parse(data);`);
    } else {
      this.printer.line(
        `return this.http.request<${responseType}>('${method}', ${pathExpr}, options);`
      );
    }
  }

  /**
   * Generate client as standalone functions
   */
  private generateClientFunctions(): void {
    // Create a shared client instance
    this.printer.jsdoc(['Shared HTTP client instance']);
    this.printer.line('let httpClient = new HttpClient();');
    this.printer.blank();

    // Configure function
    this.printer.jsdoc(['Configure the HTTP client']);
    this.printer.block(
      'export function configureClient(config: Partial<ClientConfig>): void',
      () => {
        this.printer.line('httpClient = new HttpClient(config);');
      }
    );
    this.printer.blank();

    // Generate function for each endpoint
    for (const endpoint of this.schema.endpoints) {
      this.generateClientFunction(endpoint);
    }
  }

  /**
   * Generate a standalone client function
   */
  private generateClientFunction(endpoint: IREndpoint): void {
    const functionName = camelCase(endpoint.operationId);
    const paramsType = `${pascalCase(endpoint.operationId)}Params`;
    const responseType = `${pascalCase(endpoint.operationId)}Response`;

    // Determine if params are required
    const hasRequiredParams = this.hasRequiredParams(endpoint);
    const paramsOptional = hasRequiredParams ? '' : '?';

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

    // Generate function
    this.printer.block(
      `export async function ${functionName}(params${paramsOptional}: ${paramsType}, signal?: AbortSignal): Promise<${responseType}>`,
      () => {
        const method = endpoint.method.toUpperCase();
        const hasPath = endpoint.parameters.some((p) => p.in === 'path');
        const hasQuery = endpoint.parameters.some((p) => p.in === 'query');
        const hasHeaders = endpoint.parameters.some((p) => p.in === 'header');
        const hasBody = endpoint.requestBody !== undefined;

        // Build path
        let pathExpr: string;
        if (hasPath) {
          const pathWithTemplate = endpoint.path.replace(/\{([^}]+)\}/g, '${params.path.$1}');
          pathExpr = `\`${pathWithTemplate}\``;
        } else {
          pathExpr = `'${endpoint.path}'`;
        }

        // Build options
        const optionsParts: string[] = [];
        if (hasQuery) optionsParts.push('query: params?.query');
        if (hasHeaders) optionsParts.push('headers: params?.headers as Record<string, string>');
        if (hasBody) optionsParts.push('body: params?.body');
        optionsParts.push('signal');

        this.printer.line(
          `return httpClient.request<${responseType}>('${method}', ${pathExpr}, { ${optionsParts.join(', ')} });`
        );
      }
    );
    this.printer.blank();
  }

  /**
   * Check if an endpoint has required parameters
   */
  private hasRequiredParams(endpoint: IREndpoint): boolean {
    const hasRequiredPathParams = endpoint.parameters.some((p) => p.in === 'path' && p.required);
    const hasRequiredQueryParams = endpoint.parameters.some((p) => p.in === 'query' && p.required);
    const hasRequiredBody = endpoint.requestBody?.required ?? false;

    return hasRequiredPathParams || hasRequiredQueryParams || hasRequiredBody;
  }
}

/**
 * Create a new client generator
 */
export function createClientGenerator(
  schema: IRSchema,
  options: ClientGeneratorOptions
): ClientGenerator {
  return new ClientGenerator(schema, options);
}
