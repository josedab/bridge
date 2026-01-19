/**
 * Zod schema emitter - generates Zod schemas from IR types
 */

import type { IRType, IRTypeRef, IRTypeKind, IRProperty } from '../../ir/types.js';
import type { CodePrinter } from '../../codegen/printer.js';
import { camelCase, escapeString } from '../../utils/naming.js';

/**
 * Schema emitter class for generating Zod schemas
 */
export class SchemaEmitter {
  private emittedSchemas: Set<string> = new Set();

  constructor(
    private printer: CodePrinter,
    private types: Map<string, IRType>
  ) {}

  /**
   * Emit all schemas from the type map
   */
  emitAll(): void {
    // First pass: emit all schemas
    for (const [name, type] of this.types) {
      this.emit(name, type);
      this.printer.blank();
    }
  }

  /**
   * Emit a single schema
   */
  emit(name: string, type: IRType): void {
    if (this.emittedSchemas.has(name)) return;
    this.emittedSchemas.add(name);

    const schemaName = this.getSchemaName(name);
    const schemaExpr = this.generateSchemaExpression(type);

    // Add description as a comment if present
    if (type.description) {
      this.printer.jsdoc([type.description]);
    }

    this.printer.line(`export const ${schemaName} = ${schemaExpr};`);
  }

  /**
   * Get the schema variable name for a type
   */
  getSchemaName(typeName: string): string {
    return `${camelCase(typeName)}Schema`;
  }

  /**
   * Generate a Zod schema expression for a type
   */
  generateSchemaExpression(type: IRType): string {
    switch (type.kind) {
      case 'object':
        return this.generateObjectSchema(type);

      case 'array':
        return this.generateArraySchema(type);

      case 'union':
        return this.generateUnionSchema(type);

      case 'intersection':
        return this.generateIntersectionSchema(type);

      case 'enum':
        return this.generateEnumSchema(type);

      case 'literal':
        return this.generateLiteralSchema(type);

      case 'string':
        return this.generateStringSchema(type);

      case 'number':
      case 'integer':
        return this.generateNumberSchema(type);

      case 'boolean':
        return 'z.boolean()';

      case 'null':
        return 'z.null()';

      case 'any':
        return 'z.any()';

      case 'unknown':
        return 'z.unknown()';

      case 'void':
        return 'z.void()';

      case 'date':
        return 'z.string().datetime()';

      case 'datetime':
        return 'z.string().datetime()';

      case 'binary':
      case 'file':
        return 'z.instanceof(Blob)';

      default:
        return 'z.unknown()';
    }
  }

  /**
   * Generate a Zod schema for an object type
   */
  private generateObjectSchema(type: IRType): string {
    if (!type.properties || type.properties.length === 0) {
      if (type.additionalProperties) {
        if (typeof type.additionalProperties === 'boolean') {
          return type.additionalProperties ? 'z.record(z.string(), z.unknown())' : 'z.object({})';
        }
        const valueSchema = this.generateTypeRefSchema(type.additionalProperties);
        return `z.record(z.string(), ${valueSchema})`;
      }
      return 'z.object({})';
    }

    const lines: string[] = ['z.object({'];

    for (const prop of type.properties) {
      const propSchema = this.generatePropertySchema(prop);
      lines.push(`  ${this.formatPropertyKey(prop.name)}: ${propSchema},`);
    }

    lines.push('})');

    // Add passthrough if additional properties allowed
    if (type.additionalProperties === true) {
      lines[lines.length - 1] += '.passthrough()';
    }

    return lines.join('\n');
  }

  /**
   * Generate a Zod schema for a property
   */
  private generatePropertySchema(prop: IRProperty): string {
    let schema = this.generateTypeRefSchema(prop.type);

    // Handle optional properties
    if (!prop.required) {
      schema += '.optional()';
    }

    // Handle default values
    if (prop.default !== undefined) {
      const defaultValue = this.formatDefaultValue(prop.default);
      schema += `.default(${defaultValue})`;
    }

    // Add description if present
    if (prop.description) {
      schema += `.describe(${JSON.stringify(prop.description)})`;
    }

    return schema;
  }

  /**
   * Generate a Zod schema for an array type
   */
  private generateArraySchema(type: IRType): string {
    let itemSchema: string;
    if (type.items) {
      itemSchema = this.generateTypeRefSchema(type.items);
    } else {
      itemSchema = 'z.unknown()';
    }

    let schema = `z.array(${itemSchema})`;

    // Add constraints
    if (type.minItems !== undefined) {
      schema += `.min(${type.minItems})`;
    }
    if (type.maxItems !== undefined) {
      schema += `.max(${type.maxItems})`;
    }

    return schema;
  }

  /**
   * Generate a Zod schema for a union type
   */
  private generateUnionSchema(type: IRType): string {
    if (!type.variants || type.variants.length === 0) {
      return 'z.never()';
    }

    if (type.variants.length === 1) {
      return this.generateTypeRefSchema(type.variants[0]!);
    }

    // Check for discriminated union
    if (type.discriminator) {
      return this.generateDiscriminatedUnionSchema(type);
    }

    const variantSchemas = type.variants.map((v) => this.generateTypeRefSchema(v));
    return `z.union([${variantSchemas.join(', ')}])`;
  }

  /**
   * Generate a Zod discriminated union schema
   */
  private generateDiscriminatedUnionSchema(type: IRType): string {
    const discriminator = type.discriminator!;
    const variantSchemas = type.variants!.map((v) => this.generateTypeRefSchema(v));

    return `z.discriminatedUnion('${discriminator.propertyName}', [${variantSchemas.join(', ')}])`;
  }

  /**
   * Generate a Zod schema for an intersection type
   */
  private generateIntersectionSchema(type: IRType): string {
    if (!type.members || type.members.length === 0) {
      return 'z.unknown()';
    }

    if (type.members.length === 1) {
      return this.generateTypeRefSchema(type.members[0]!);
    }

    // Use .merge() for combining object schemas
    const memberSchemas = type.members.map((m) => this.generateTypeRefSchema(m));
    let result = memberSchemas[0]!;

    for (let i = 1; i < memberSchemas.length; i++) {
      result += `.merge(${memberSchemas[i]})`;
    }

    return result;
  }

  /**
   * Generate a Zod schema for an enum type
   */
  private generateEnumSchema(type: IRType): string {
    if (!type.enumValues || type.enumValues.length === 0) {
      return 'z.never()';
    }

    const values = type.enumValues.map((v) =>
      typeof v.value === 'string' ? `'${escapeString(v.value)}'` : String(v.value)
    );

    // Check if all values are strings
    const allStrings = type.enumValues.every((v) => typeof v.value === 'string');

    if (allStrings) {
      return `z.enum([${values.join(', ')}])`;
    }

    // Use z.union with literals for mixed or numeric enums
    const literals = values.map((v) => `z.literal(${v})`);
    return `z.union([${literals.join(', ')}])`;
  }

  /**
   * Generate a Zod schema for a literal type
   */
  private generateLiteralSchema(type: IRType): string {
    if (type.literalValue === undefined) {
      return 'z.never()';
    }

    if (typeof type.literalValue === 'string') {
      return `z.literal('${escapeString(type.literalValue)}')`;
    }

    return `z.literal(${type.literalValue})`;
  }

  /**
   * Generate a Zod schema for a string type with constraints
   */
  private generateStringSchema(type: IRType): string {
    let schema = 'z.string()';

    // Format-specific schemas
    if (type.format) {
      switch (type.format) {
        case 'email':
          schema += '.email()';
          break;
        case 'uri':
        case 'url':
          schema += '.url()';
          break;
        case 'uuid':
          schema += '.uuid()';
          break;
        case 'date':
          schema += '.date()';
          break;
        case 'date-time':
          schema += '.datetime()';
          break;
        case 'ip':
        case 'ipv4':
          schema += '.ip({ version: "v4" })';
          break;
        case 'ipv6':
          schema += '.ip({ version: "v6" })';
          break;
      }
    }

    // Add constraints
    if (type.minLength !== undefined) {
      schema += `.min(${type.minLength})`;
    }
    if (type.maxLength !== undefined) {
      schema += `.max(${type.maxLength})`;
    }
    if (type.pattern) {
      schema += `.regex(/${type.pattern}/)`;
    }

    return schema;
  }

  /**
   * Generate a Zod schema for a number type with constraints
   */
  private generateNumberSchema(type: IRType): string {
    let schema = type.kind === 'integer' ? 'z.number().int()' : 'z.number()';

    // Add constraints
    if (type.minimum !== undefined) {
      schema += `.gte(${type.minimum})`;
    }
    if (type.maximum !== undefined) {
      schema += `.lte(${type.maximum})`;
    }
    if (type.exclusiveMinimum !== undefined) {
      schema += `.gt(${type.exclusiveMinimum})`;
    }
    if (type.exclusiveMaximum !== undefined) {
      schema += `.lt(${type.exclusiveMaximum})`;
    }

    return schema;
  }

  /**
   * Generate a Zod schema for a type reference
   */
  generateTypeRefSchema(ref: IRTypeRef): string {
    let schema: string;

    switch (ref.kind) {
      case 'reference':
        if (ref.name) {
          schema = this.getSchemaName(ref.name);
        } else {
          schema = 'z.unknown()';
        }
        break;

      case 'primitive':
        schema = this.generatePrimitiveSchema(ref.primitiveKind ?? 'unknown');
        break;

      case 'inline':
        if (ref.inlineType) {
          schema = this.generateSchemaExpression(ref.inlineType);
        } else {
          schema = 'z.unknown()';
        }
        break;

      default:
        schema = 'z.unknown()';
    }

    if (ref.nullable) {
      schema += '.nullable()';
    }

    return schema;
  }

  /**
   * Generate a Zod schema for a primitive type kind
   */
  private generatePrimitiveSchema(kind: IRTypeKind): string {
    switch (kind) {
      case 'string':
        return 'z.string()';
      case 'number':
        return 'z.number()';
      case 'integer':
        return 'z.number().int()';
      case 'boolean':
        return 'z.boolean()';
      case 'null':
        return 'z.null()';
      case 'any':
        return 'z.any()';
      case 'unknown':
        return 'z.unknown()';
      case 'void':
        return 'z.void()';
      default:
        return 'z.unknown()';
    }
  }

  /**
   * Format a property key for Zod object schema
   */
  private formatPropertyKey(name: string): string {
    if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) {
      return name;
    }
    return `'${escapeString(name)}'`;
  }

  /**
   * Format a default value for Zod
   */
  private formatDefaultValue(value: unknown): string {
    if (typeof value === 'string') {
      return `'${escapeString(value)}'`;
    }
    if (value === null) {
      return 'null';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }
}
