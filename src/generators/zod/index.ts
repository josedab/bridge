/**
 * Zod schema generator
 */

import type { IRSchema, IREndpoint } from '../../ir/types.js';
import { BaseGenerator, type GeneratorOptions } from '../base.js';
import { SchemaEmitter } from './schema-emitter.js';
import { pascalCase, camelCase } from '../../utils/naming.js';

export { SchemaEmitter } from './schema-emitter.js';

/** Zod generator options */
export interface ZodGeneratorOptions extends GeneratorOptions {
  /** Generate infer types from schemas */
  inferTypes?: boolean;
  /** Generate request/response schemas for endpoints */
  generateEndpointSchemas?: boolean;
}

/**
 * Zod schema generator
 */
export class ZodGenerator extends BaseGenerator {
  declare protected options: ZodGeneratorOptions;
  private schemaEmitter!: SchemaEmitter;

  constructor(schema: IRSchema, options: ZodGeneratorOptions) {
    super(schema, options);
  }

  get name(): string {
    return 'Zod schemas';
  }

  get filename(): string {
    return 'schemas.ts';
  }

  generate(): void {
    this.addHeader();

    // Import Zod
    this.printer.import('z', 'zod');
    this.printer.blank();

    // Create schema emitter
    this.schemaEmitter = new SchemaEmitter(this.printer, this.schema.types);

    // Emit all type schemas
    this.schemaEmitter.emitAll();

    // Generate endpoint schemas if enabled
    if (this.options.generateEndpointSchemas !== false && this.schema.endpoints.length > 0) {
      this.generateEndpointSchemas();
    }

    // Generate infer types if enabled
    if (this.options.inferTypes !== false) {
      this.generateInferTypes();
    }
  }

  /**
   * Generate schemas for endpoint params and responses
   */
  private generateEndpointSchemas(): void {
    this.printer.comment('=== Endpoint Schemas ===');
    this.printer.blank();

    for (const endpoint of this.schema.endpoints) {
      this.generateEndpointParamsSchema(endpoint);
      this.generateEndpointResponseSchema(endpoint);
    }
  }

  /**
   * Generate params schema for an endpoint
   */
  private generateEndpointParamsSchema(endpoint: IREndpoint): void {
    const schemaName = `${camelCase(endpoint.operationId)}ParamsSchema`;

    const hasPathParams = endpoint.parameters.some((p) => p.in === 'path');
    const hasQueryParams = endpoint.parameters.some((p) => p.in === 'query');
    const hasHeaderParams = endpoint.parameters.some((p) => p.in === 'header');
    const hasRequestBody = endpoint.requestBody !== undefined;

    if (!hasPathParams && !hasQueryParams && !hasHeaderParams && !hasRequestBody) {
      this.printer.line(`export const ${schemaName} = z.void();`);
      this.printer.blank();
      return;
    }

    const schemaLines: string[] = ['z.object({'];

    // Path parameters
    if (hasPathParams) {
      const pathParams = endpoint.parameters.filter((p) => p.in === 'path');
      schemaLines.push('  path: z.object({');
      for (const param of pathParams) {
        const paramSchema = this.schemaEmitter.generateTypeRefSchema(param.type);
        const optionalChain = param.required ? '' : '.optional()';
        schemaLines.push(`    ${param.name}: ${paramSchema}${optionalChain},`);
      }
      schemaLines.push('  }),');
    }

    // Query parameters
    if (hasQueryParams) {
      const queryParams = endpoint.parameters.filter((p) => p.in === 'query');
      const allRequired = queryParams.every((p) => p.required);
      schemaLines.push('  query: z.object({');
      for (const param of queryParams) {
        const paramSchema = this.schemaEmitter.generateTypeRefSchema(param.type);
        const optionalChain = param.required ? '' : '.optional()';
        schemaLines.push(`    ${param.name}: ${paramSchema}${optionalChain},`);
      }
      schemaLines.push(`  })${allRequired ? '' : '.optional()'},`);
    }

    // Header parameters
    if (hasHeaderParams) {
      const headerParams = endpoint.parameters.filter((p) => p.in === 'header');
      const allRequired = headerParams.every((p) => p.required);
      schemaLines.push('  headers: z.object({');
      for (const param of headerParams) {
        const paramSchema = this.schemaEmitter.generateTypeRefSchema(param.type);
        const optionalChain = param.required ? '' : '.optional()';
        schemaLines.push(`    ${param.name}: ${paramSchema}${optionalChain},`);
      }
      schemaLines.push(`  })${allRequired ? '' : '.optional()'},`);
    }

    // Request body
    if (hasRequestBody) {
      const requestBody = endpoint.requestBody!;
      const jsonContent = requestBody.content.find((c) => c.mediaType === 'application/json');
      const content = jsonContent ?? requestBody.content[0];

      if (content) {
        const bodySchema = this.schemaEmitter.generateTypeRefSchema(content.schema);
        const optionalChain = requestBody.required ? '' : '.optional()';
        schemaLines.push(`  body: ${bodySchema}${optionalChain},`);
      }
    }

    schemaLines.push('})');

    this.printer.line(`export const ${schemaName} = ${schemaLines.join('\n')};`);
    this.printer.blank();
  }

  /**
   * Generate response schema for an endpoint
   */
  private generateEndpointResponseSchema(endpoint: IREndpoint): void {
    const schemaName = `${camelCase(endpoint.operationId)}ResponseSchema`;

    // Get successful responses (2xx)
    const successResponses = endpoint.responses.filter((r) => r.statusCode.startsWith('2'));

    if (successResponses.length === 0) {
      this.printer.line(`export const ${schemaName} = z.void();`);
      this.printer.blank();
      return;
    }

    // Collect all response schemas
    const responseSchemas: string[] = [];

    for (const response of successResponses) {
      if (response.content && response.content.length > 0) {
        const jsonContent = response.content.find((c) => c.mediaType === 'application/json');
        const content = jsonContent ?? response.content[0];

        if (content) {
          responseSchemas.push(this.schemaEmitter.generateTypeRefSchema(content.schema));
        }
      } else {
        responseSchemas.push('z.void()');
      }
    }

    // Deduplicate schemas
    const uniqueSchemas = [...new Set(responseSchemas)];

    if (uniqueSchemas.length === 1) {
      this.printer.line(`export const ${schemaName} = ${uniqueSchemas[0]};`);
    } else {
      this.printer.line(`export const ${schemaName} = z.union([${uniqueSchemas.join(', ')}]);`);
    }
    this.printer.blank();
  }

  /**
   * Generate infer types from schemas
   */
  private generateInferTypes(): void {
    this.printer.comment('=== Inferred Types ===');
    this.printer.blank();

    // Generate infer types for all schemas
    for (const [name] of this.schema.types) {
      const schemaName = `${camelCase(name)}Schema`;
      const typeName = `${name}`;
      this.printer.line(`export type ${typeName} = z.infer<typeof ${schemaName}>;`);
    }

    this.printer.blank();

    // Generate infer types for endpoint schemas
    if (this.options.generateEndpointSchemas !== false && this.schema.endpoints.length > 0) {
      for (const endpoint of this.schema.endpoints) {
        const paramsSchemaName = `${camelCase(endpoint.operationId)}ParamsSchema`;
        const responseSchemaName = `${camelCase(endpoint.operationId)}ResponseSchema`;
        const paramsTypeName = `${pascalCase(endpoint.operationId)}Params`;
        const responseTypeName = `${pascalCase(endpoint.operationId)}Response`;

        this.printer.line(`export type ${paramsTypeName} = z.infer<typeof ${paramsSchemaName}>;`);
        this.printer.line(
          `export type ${responseTypeName} = z.infer<typeof ${responseSchemaName}>;`
        );
      }
    }
  }
}

/**
 * Create a new Zod generator
 */
export function createZodGenerator(schema: IRSchema, options: ZodGeneratorOptions): ZodGenerator {
  return new ZodGenerator(schema, options);
}
