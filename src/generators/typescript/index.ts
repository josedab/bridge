/**
 * TypeScript types generator
 */

import type { IRSchema, IREndpoint, IRParameter, IRRequestBody } from '../../ir/types.js';
import { BaseGenerator, type GeneratorOptions } from '../base.js';
import { TypeEmitter } from './type-emitter.js';
import { TypeGuardEmitter } from './guard-emitter.js';
import { BrandedTypesEmitter } from './branded-types.js';
import { typeRefToTs, formatPropertyName } from './utils.js';
import { pascalCase } from '../../utils/naming.js';

export { TypeEmitter } from './type-emitter.js';
export { TypeGuardEmitter } from './guard-emitter.js';
export * from './utils.js';
export {
  MultiFileTypeScriptGenerator,
  createMultiFileTypeScriptGenerator,
  type MultiFileTypeScriptOptions,
} from './multi-file.js';
export {
  BrandedTypesEmitter,
  generateBrandedTypes,
  type BrandedTypesOptions,
} from './branded-types.js';

/** TypeScript generator options */
export interface TypeScriptGeneratorOptions extends GeneratorOptions {
  /** Generate enums as const objects instead of TypeScript enums */
  enumsAsConst?: boolean;
  /** Generate type guards for discriminated unions */
  generateTypeGuards?: boolean;
  /** Generate input types for mutations */
  generateInputTypes?: boolean;
  /** Generate branded/nominal types for ID fields */
  brandedTypes?: boolean;
  /** Custom pattern to match ID fields for branding */
  brandedIdPattern?: RegExp;
}

/**
 * TypeScript types generator
 */
export class TypeScriptGenerator extends BaseGenerator {
  declare protected options: TypeScriptGeneratorOptions;

  constructor(schema: IRSchema, options: TypeScriptGeneratorOptions) {
    super(schema, options);
  }

  get name(): string {
    return 'TypeScript types';
  }

  get filename(): string {
    return 'types.ts';
  }

  generate(): void {
    this.addHeader();

    // Emit all types
    const emitter = new TypeEmitter(this.printer, this.schema.types);
    emitter.emitAll();

    // Generate endpoint-specific types if there are endpoints
    if (this.schema.endpoints.length > 0) {
      this.generateEndpointTypes();
    }

    // Generate operation-specific types for GraphQL
    if (this.schema.operations.length > 0) {
      this.generateOperationTypes();
    }

    // Generate type guards if enabled
    if (this.options.generateTypeGuards) {
      this.printer.blank();
      const guardEmitter = new TypeGuardEmitter(this.printer, this.schema.types);
      guardEmitter.emitAll();
    }

    // Generate branded types if enabled
    if (this.options.brandedTypes) {
      this.printer.blank();
      const brandedEmitter = new BrandedTypesEmitter(this.printer, this.schema.types, {
        idPattern: this.options.brandedIdPattern,
      });
      brandedEmitter.emitAll();
    }
  }

  /**
   * Generate types for REST endpoints
   */
  private generateEndpointTypes(): void {
    this.printer.comment('=== Endpoint Types ===');
    this.printer.blank();

    for (const endpoint of this.schema.endpoints) {
      this.generateEndpointParamsType(endpoint);
      this.generateEndpointResponseType(endpoint);
    }

    // Generate a union type of all operation IDs
    this.generateOperationIdUnion();
  }

  /**
   * Generate params type for an endpoint
   */
  private generateEndpointParamsType(endpoint: IREndpoint): void {
    const typeName = `${pascalCase(endpoint.operationId)}Params`;

    // Collect all parameters and request body
    const hasPathParams = endpoint.parameters.some((p) => p.in === 'path');
    const hasQueryParams = endpoint.parameters.some((p) => p.in === 'query');
    const hasHeaderParams = endpoint.parameters.some((p) => p.in === 'header');
    const hasRequestBody = endpoint.requestBody !== undefined;

    if (!hasPathParams && !hasQueryParams && !hasHeaderParams && !hasRequestBody) {
      // No params needed
      this.printer.line(`export type ${typeName} = void;`);
      this.printer.blank();
      return;
    }

    this.printer.block(`export interface ${typeName}`, () => {
      // Path parameters
      if (hasPathParams) {
        this.generateParamGroup(
          'path',
          endpoint.parameters.filter((p) => p.in === 'path')
        );
      }

      // Query parameters
      if (hasQueryParams) {
        this.generateParamGroup(
          'query',
          endpoint.parameters.filter((p) => p.in === 'query')
        );
      }

      // Header parameters
      if (hasHeaderParams) {
        this.generateParamGroup(
          'headers',
          endpoint.parameters.filter((p) => p.in === 'header')
        );
      }

      // Request body
      if (hasRequestBody) {
        this.generateRequestBodyType(endpoint.requestBody!);
      }
    });
    this.printer.blank();
  }

  /**
   * Generate a parameter group (path, query, or headers)
   */
  private generateParamGroup(groupName: string, params: IRParameter[]): void {
    const allRequired = params.every((p) => p.required);
    const optional = allRequired ? '' : '?';

    this.printer.line(`${groupName}${optional}: {`);
    this.printer.indent();

    for (const param of params) {
      const paramOptional = param.required ? '' : '?';
      const paramType = typeRefToTs(param.type, this.schema.types);
      this.printer.line(`${formatPropertyName(param.name)}${paramOptional}: ${paramType};`);
    }

    this.printer.dedent();
    this.printer.line('};');
  }

  /**
   * Generate request body type
   */
  private generateRequestBodyType(requestBody: IRRequestBody): void {
    const optional = requestBody.required ? '' : '?';

    // Find the primary content type (prefer JSON)
    const jsonContent = requestBody.content.find((c) => c.mediaType === 'application/json');
    const content = jsonContent ?? requestBody.content[0];

    if (content) {
      const bodyType = typeRefToTs(content.schema, this.schema.types);
      this.printer.line(`body${optional}: ${bodyType};`);
    }
  }

  /**
   * Generate response type for an endpoint
   */
  private generateEndpointResponseType(endpoint: IREndpoint): void {
    const typeName = `${pascalCase(endpoint.operationId)}Response`;

    // Get successful responses (2xx)
    const successResponses = endpoint.responses.filter((r) => r.statusCode.startsWith('2'));

    if (successResponses.length === 0) {
      this.printer.line(`export type ${typeName} = void;`);
      this.printer.blank();
      return;
    }

    // Collect all response types
    const responseTypes: string[] = [];

    for (const response of successResponses) {
      if (response.content && response.content.length > 0) {
        const jsonContent = response.content.find((c) => c.mediaType === 'application/json');
        const content = jsonContent ?? response.content[0];

        if (content) {
          responseTypes.push(typeRefToTs(content.schema, this.schema.types));
        }
      } else {
        responseTypes.push('void');
      }
    }

    // Deduplicate response types
    const uniqueTypes = [...new Set(responseTypes)];

    if (uniqueTypes.length === 1) {
      this.printer.line(`export type ${typeName} = ${uniqueTypes[0]};`);
    } else {
      this.printer.line(`export type ${typeName} = ${uniqueTypes.join(' | ')};`);
    }
    this.printer.blank();
  }

  /**
   * Generate a union type of all operation IDs
   */
  private generateOperationIdUnion(): void {
    if (this.schema.endpoints.length === 0) return;

    const operationIds = this.schema.endpoints.map((e) => `'${e.operationId}'`);
    this.printer.line(`export type OperationId = ${operationIds.join(' | ')};`);
    this.printer.blank();
  }

  /**
   * Generate types for GraphQL operations
   */
  private generateOperationTypes(): void {
    this.printer.comment('=== Operation Types ===');
    this.printer.blank();

    for (const operation of this.schema.operations) {
      const varTypeName = `${pascalCase(operation.name)}Variables`;
      const retTypeName = `${pascalCase(operation.name)}Result`;

      // Generate variables type
      if (operation.variables.length === 0) {
        this.printer.line(`export type ${varTypeName} = void;`);
      } else {
        this.printer.block(`export interface ${varTypeName}`, () => {
          for (const variable of operation.variables) {
            const varType = typeRefToTs(variable.type, this.schema.types);
            const optional = variable.default !== undefined ? '?' : '';
            this.printer.line(`${variable.name}${optional}: ${varType};`);
          }
        });
      }
      this.printer.blank();

      // Generate result type
      const resultType = typeRefToTs(operation.returnType, this.schema.types);
      this.printer.line(`export type ${retTypeName} = ${resultType};`);
      this.printer.blank();
    }
  }
}

/**
 * Create a new TypeScript generator
 */
export function createTypeScriptGenerator(
  schema: IRSchema,
  options: TypeScriptGeneratorOptions
): TypeScriptGenerator {
  return new TypeScriptGenerator(schema, options);
}
