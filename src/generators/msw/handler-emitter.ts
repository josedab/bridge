/**
 * Handler emitter - generates MSW request handlers
 */

import type { IREndpoint, IRType, IRTypeRef } from '../../ir/types.js';
import type { CodePrinter } from '../../codegen/printer.js';

/**
 * Handler emitter for generating MSW request handlers
 */
export class HandlerEmitter {
  constructor(
    private printer: CodePrinter,
    _types: Map<string, IRType>,
    private baseUrl: string = ''
  ) {
    // _types reserved for future use in sophisticated mock generation
  }

  /**
   * Emit all request handlers
   */
  emitAll(endpoints: IREndpoint[]): void {
    this.printer.comment('=== MSW Request Handlers ===');
    this.printer.blank();

    // Emit individual handler functions
    for (const endpoint of endpoints) {
      this.emitHandler(endpoint);
      this.printer.blank();
    }

    // Emit handlers array
    this.emitHandlersArray(endpoints);
  }

  /**
   * Emit a single request handler
   */
  private emitHandler(endpoint: IREndpoint): void {
    const handlerName = `${endpoint.operationId}Handler`;
    const method = endpoint.method.toLowerCase();
    const pathPattern = this.convertPathToMswPattern(endpoint.path);
    const responseMock = this.getResponseMock(endpoint);

    this.printer.jsdocWithTags(
      `Handler for ${endpoint.method.toUpperCase()} ${endpoint.path}`,
      endpoint.summary ? [{ tag: 'description', value: endpoint.summary }] : undefined
    );

    this.printer.const(
      handlerName,
      `http.${method}('${this.baseUrl}${pathPattern}', ({ request, params }) => {
    // Access path params: params.petId, etc.
    // Access request body: await request.json()
    ${responseMock}
  })`
    );
  }

  /**
   * Convert OpenAPI path template to MSW path pattern
   * e.g., /pets/{petId} -> /pets/:petId
   */
  private convertPathToMswPattern(path: string): string {
    return path.replace(/\{(\w+)\}/g, ':$1');
  }

  /**
   * Generate the response mock for an endpoint
   */
  private getResponseMock(endpoint: IREndpoint): string {
    // Find successful response (2xx)
    const successResponse = endpoint.responses.find((r) => r.statusCode.startsWith('2'));

    if (!successResponse) {
      return 'return new HttpResponse(null, { status: 204 });';
    }

    // Check for no content
    if (successResponse.statusCode === '204' || !successResponse.content) {
      return 'return new HttpResponse(null, { status: 204 });';
    }

    // Find JSON content
    const jsonContent = successResponse.content.find((c) => c.mediaType === 'application/json');

    if (!jsonContent) {
      return 'return new HttpResponse(null, { status: 204 });';
    }

    // Generate mock based on response type
    const mockCall = this.generateMockForTypeRef(jsonContent.schema);

    return `return HttpResponse.json(${mockCall});`;
  }

  /**
   * Generate mock function call for a type reference
   */
  private generateMockForTypeRef(typeRef: IRTypeRef): string {
    switch (typeRef.kind) {
      case 'reference':
        return `mock${typeRef.name}()`;

      case 'inline':
        if (typeRef.inlineType) {
          return this.generateMockForInlineType(typeRef.inlineType);
        }
        return 'null';

      case 'primitive':
        return this.generateMockForPrimitive(typeRef.primitiveKind!);

      default:
        return 'null';
    }
  }

  /**
   * Generate mock for an inline type
   */
  private generateMockForInlineType(type: IRType): string {
    switch (type.kind) {
      case 'array':
        if (type.items) {
          const itemMock = this.generateMockForTypeRef(type.items);
          return `[${itemMock}, ${itemMock}]`;
        }
        return '[]';

      case 'object':
        if (type.properties) {
          return '{}';
        }
        return '{}';

      default:
        return 'null';
    }
  }

  /**
   * Generate mock for a primitive type
   */
  private generateMockForPrimitive(kind: string): string {
    switch (kind) {
      case 'string':
        return "'mock-string'";
      case 'number':
      case 'integer':
        return '42';
      case 'boolean':
        return 'true';
      case 'null':
        return 'null';
      default:
        return 'null';
    }
  }

  /**
   * Emit the handlers array that combines all handlers
   */
  private emitHandlersArray(endpoints: IREndpoint[]): void {
    const handlerNames = endpoints.map((e) => `${e.operationId}Handler`);

    this.printer.jsdocWithTags('All MSW handlers for this API');

    this.printer.const(
      'handlers',
      `[\n  ${handlerNames.join(',\n  ')},\n]`,
      'ReturnType<typeof http.get>[]'
    );
  }
}
