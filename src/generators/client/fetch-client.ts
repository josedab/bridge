/**
 * Fetch client utilities and base implementation
 */

import type { CodePrinter } from '../../codegen/printer.js';

/**
 * Generate the base fetch client code
 */
export function generateFetchClientBase(printer: CodePrinter, baseUrl?: string): void {
  // Generate client configuration interface
  printer.block('export interface ClientConfig', () => {
    printer.line('baseUrl: string;');
    printer.line('headers?: Record<string, string>;');
    printer.line('credentials?: RequestCredentials;');
    printer.line('fetch?: typeof fetch;');
    printer.line('onRequest?: (request: RequestInit) => RequestInit | Promise<RequestInit>;');
    printer.line('onResponse?: (response: Response) => Response | Promise<Response>;');
    printer.line('onError?: (error: Error) => void;');
  });
  printer.blank();

  // Generate request options interface
  printer.block('export interface RequestOptions', () => {
    printer.line('params?: Record<string, string | number | boolean | undefined>;');
    printer.line('query?: Record<string, string | number | boolean | undefined>;');
    printer.line('headers?: Record<string, string>;');
    printer.line('body?: unknown;');
    printer.line('signal?: AbortSignal;');
  });
  printer.blank();

  // Generate API error class
  printer.jsdoc(['API error with status code and response data']);
  printer.block('export class ApiError extends Error', () => {
    printer.line('constructor(');
    printer.indent();
    printer.line('public readonly status: number,');
    printer.line('public readonly statusText: string,');
    printer.line('public readonly data: unknown,');
    printer.line('message?: string');
    printer.dedent();
    printer.line(') {');
    printer.indent();
    printer.line('super(message ?? `API Error: ${status} ${statusText}`);');
    printer.line("this.name = 'ApiError';");
    printer.dedent();
    printer.line('}');
  });
  printer.blank();

  // Generate default config
  const defaultBaseUrl = baseUrl ? `'${baseUrl}'` : "''";
  printer.line(`const defaultConfig: ClientConfig = {`);
  printer.line(`  baseUrl: ${defaultBaseUrl},`);
  printer.line(`};`);
  printer.blank();

  // Generate client class
  printer.jsdoc(['HTTP client for making API requests']);
  printer.block('export class HttpClient', () => {
    printer.line('private config: ClientConfig;');
    printer.blank();

    // Constructor
    printer.block('constructor(config: Partial<ClientConfig> = {})', () => {
      printer.line('this.config = { ...defaultConfig, ...config };');
    });
    printer.blank();

    // Request method
    printer.block(
      'async request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T>',
      () => {
        // Build URL
        printer.line('let url = this.buildUrl(path, options.params);');
        printer.blank();

        // Add query params
        printer.block('if (options.query)', () => {
          printer.line('const searchParams = new URLSearchParams();');
          printer.block('for (const [key, value] of Object.entries(options.query))', () => {
            printer.block('if (value !== undefined)', () => {
              printer.line('searchParams.append(key, String(value));');
            });
          });
          printer.line('const queryString = searchParams.toString();');
          printer.block('if (queryString)', () => {
            printer.line('url += `?${queryString}`;');
          });
        });
        printer.blank();

        // Build headers
        printer.line('const headers: Record<string, string> = {');
        printer.line("  'Content-Type': 'application/json',");
        printer.line('  ...this.config.headers,');
        printer.line('  ...options.headers,');
        printer.line('};');
        printer.blank();

        // Build request init
        printer.line('let init: RequestInit = {');
        printer.line('  method,');
        printer.line('  headers,');
        printer.line('  credentials: this.config.credentials,');
        printer.line('  signal: options.signal,');
        printer.line('};');
        printer.blank();

        // Add body
        printer.block('if (options.body !== undefined)', () => {
          printer.line('init.body = JSON.stringify(options.body);');
        });
        printer.blank();

        // Apply request interceptor
        printer.block('if (this.config.onRequest)', () => {
          printer.line('init = await this.config.onRequest(init);');
        });
        printer.blank();

        // Make request
        printer.line('const fetchFn = this.config.fetch ?? fetch;');
        printer.line('let response = await fetchFn(url, init);');
        printer.blank();

        // Apply response interceptor
        printer.block('if (this.config.onResponse)', () => {
          printer.line('response = await this.config.onResponse(response);');
        });
        printer.blank();

        // Handle errors
        printer.block('if (!response.ok)', () => {
          printer.line('let data: unknown;');
          printer.block('try', () => {
            printer.line('data = await response.json();');
          });
          printer.block('catch', () => {
            printer.line('data = await response.text();');
          });
          printer.line('const error = new ApiError(response.status, response.statusText, data);');
          printer.line('this.config.onError?.(error);');
          printer.line('throw error;');
        });
        printer.blank();

        // Parse response
        printer.line("const contentType = response.headers.get('content-type');");
        printer.block("if (contentType?.includes('application/json'))", () => {
          printer.line('return response.json();');
        });
        printer.blank();
        printer.line('return undefined as T;');
      }
    );
    printer.blank();

    // Build URL method
    printer.block(
      'private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string',
      () => {
        printer.line('let url = `${this.config.baseUrl}${path}`;');
        printer.blank();
        printer.block('if (params)', () => {
          printer.block('for (const [key, value] of Object.entries(params))', () => {
            printer.block('if (value !== undefined)', () => {
              printer.line('url = url.replace(`{${key}}`, encodeURIComponent(String(value)));');
            });
          });
        });
        printer.blank();
        printer.line('return url;');
      }
    );
    printer.blank();

    // HTTP method shortcuts
    for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
      printer.line(`${method}<T>(path: string, options?: RequestOptions): Promise<T> {`);
      printer.line(`  return this.request<T>('${method.toUpperCase()}', path, options);`);
      printer.line('}');
      printer.blank();
    }
  });
}

/**
 * Generate path parameter substitution code
 */
export function generatePathSubstitution(path: string): string {
  // Convert OpenAPI path params {petId} to template literal ${params.petId}
  return path.replace(/\{([^}]+)\}/g, '${params.$1}');
}
