/**
 * Converts OpenAPI schema objects to IR types
 */

import type {
  IRType,
  IRTypeRef,
  IRProperty,
  IRTypeKind,
  IREnumValue,
  IRDiscriminator,
} from '../../ir/types.js';
import {
  createPrimitiveRef,
  createTypeRef,
  createInlineTypeRef,
  createObjectType,
  createArrayType,
  createUnionType,
  createIntersectionType,
  createEnumType,
} from '../../ir/types.js';
import { pascalCase, toEnumMemberName, sanitizeIdentifier } from '../../utils/naming.js';
import { type RefResolver, getRefTypeName } from './ref-resolver.js';
import type { SchemaObject, SchemaOrRef, MixedSchemaObject } from './types.js';
import { isReference } from './types.js';

/** Type assertion helper for accessing mixed schema properties */
function asMixed(schema: SchemaObject): MixedSchemaObject {
  return schema as MixedSchemaObject;
}

/**
 * Schema converter class
 */
export class SchemaConverter {
  /** Counter for generating unique names for inline types */
  private inlineTypeCounter = 0;

  constructor(private resolver: RefResolver) {}

  /**
   * Convert an OpenAPI schema to an IR type
   */
  convertSchema(schema: SchemaOrRef, name: string): IRType {
    // Handle references
    if (isReference(schema)) {
      const { value, isCircular } = this.resolver.resolveIfRef<SchemaObject>(schema);
      if (isCircular) {
        // Return a placeholder for circular references
        return {
          name,
          kind: 'any',
          description: `Circular reference to ${getRefTypeName(schema.$ref)}`,
        };
      }
      schema = value;
    }

    // Handle combined schemas first
    if (schema.oneOf) {
      return this.convertOneOf(schema, name);
    }
    if (schema.anyOf) {
      return this.convertAnyOf(schema, name);
    }
    if (schema.allOf) {
      return this.convertAllOf(schema, name);
    }

    // Handle by type
    const type = this.getSchemaType(schema);

    switch (type) {
      case 'object':
        return this.convertObjectSchema(schema, name);
      case 'array':
        return this.convertArraySchema(schema, name);
      case 'string':
        if (schema.enum) {
          return this.convertEnumSchema(schema, name);
        }
        return this.convertPrimitiveSchema(schema, name, 'string');
      case 'number':
      case 'integer':
        if (schema.enum) {
          return this.convertEnumSchema(schema, name);
        }
        return this.convertPrimitiveSchema(schema, name, type);
      case 'boolean':
        return this.convertPrimitiveSchema(schema, name, 'boolean');
      case 'null':
        return this.convertPrimitiveSchema(schema, name, 'null');
      default:
        return { name, kind: 'any', description: schema.description };
    }
  }

  /**
   * Convert a schema to a type reference
   */
  convertToTypeRef(schema: SchemaOrRef, contextName: string): IRTypeRef {
    // Handle references
    if (isReference(schema)) {
      const typeName = getRefTypeName(schema.$ref);
      const nullable = this.isNullable(schema);
      return createTypeRef(typeName, nullable);
    }

    // Check for nullable
    const nullable = this.isNullable(schema);

    // Handle primitives directly without creating a type
    const type = this.getSchemaType(schema);

    if (this.isPrimitiveType(type) && !schema.enum) {
      const kind = this.mapPrimitiveType(type);
      return createPrimitiveRef(kind, nullable);
    }

    // For complex types, create an inline type
    const inlineName = this.generateInlineTypeName(contextName);
    const irType = this.convertSchema(schema, inlineName);

    return createInlineTypeRef(irType, nullable);
  }

  /**
   * Convert oneOf to a union type
   */
  private convertOneOf(schema: SchemaObject, name: string): IRType {
    const variants = (schema.oneOf ?? []).map((variant, index) =>
      this.convertToTypeRef(variant as SchemaOrRef, `${name}Variant${index}`)
    );

    // Check for discriminator
    let discriminator: IRDiscriminator | undefined;
    if (schema.discriminator) {
      discriminator = {
        propertyName: schema.discriminator.propertyName,
        mapping: schema.discriminator.mapping
          ? new Map(Object.entries(schema.discriminator.mapping))
          : undefined,
      };
    }

    return createUnionType(name, variants, discriminator, {
      description: schema.description,
      deprecated: schema.deprecated,
    });
  }

  /**
   * Convert anyOf to a union type
   */
  private convertAnyOf(schema: SchemaObject, name: string): IRType {
    const variants = (schema.anyOf ?? []).map((variant, index) =>
      this.convertToTypeRef(variant as SchemaOrRef, `${name}Variant${index}`)
    );

    return createUnionType(name, variants, undefined, {
      description: schema.description,
      deprecated: schema.deprecated,
    });
  }

  /**
   * Convert allOf to an intersection type
   */
  private convertAllOf(schema: SchemaObject, name: string): IRType {
    const members = (schema.allOf ?? []).map((member, index) =>
      this.convertToTypeRef(member as SchemaOrRef, `${name}Part${index}`)
    );

    return createIntersectionType(name, members, {
      description: schema.description,
      deprecated: schema.deprecated,
    });
  }

  /**
   * Convert an object schema
   */
  private convertObjectSchema(schema: SchemaObject, name: string): IRType {
    const properties: IRProperty[] = [];
    const requiredSet = new Set(schema.required ?? []);

    if (schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        const typeRef = this.convertToTypeRef(
          propSchema as SchemaOrRef,
          `${name}${pascalCase(propName)}`
        );

        const propObj = isReference(propSchema)
          ? this.resolver.resolveIfRef<SchemaObject>(propSchema).value
          : propSchema;

        properties.push({
          name: propName,
          type: typeRef,
          required: requiredSet.has(propName),
          description: propObj?.description,
          deprecated: propObj?.deprecated,
          default: propObj?.default,
          readonly: propObj?.readOnly,
          writeonly: propObj?.writeOnly,
        });
      }
    }

    // Handle additionalProperties
    let additionalProperties: IRTypeRef | boolean | undefined;
    if (schema.additionalProperties !== undefined) {
      if (typeof schema.additionalProperties === 'boolean') {
        additionalProperties = schema.additionalProperties;
      } else {
        additionalProperties = this.convertToTypeRef(
          schema.additionalProperties as SchemaOrRef,
          `${name}AdditionalProperties`
        );
      }
    }

    return createObjectType(name, properties, {
      description: schema.description,
      deprecated: schema.deprecated,
      additionalProperties,
    });
  }

  /**
   * Convert an array schema
   */
  private convertArraySchema(schema: SchemaObject, name: string): IRType {
    const mixed = asMixed(schema);
    let items: IRTypeRef;

    if (mixed.items) {
      items = this.convertToTypeRef(mixed.items as SchemaOrRef, `${name}Item`);
    } else {
      items = createPrimitiveRef('any');
    }

    return createArrayType(name, items, {
      description: mixed.description,
      deprecated: mixed.deprecated,
      minItems: mixed.minItems,
      maxItems: mixed.maxItems,
      uniqueItems: mixed.uniqueItems,
    });
  }

  /**
   * Convert an enum schema
   */
  private convertEnumSchema(schema: SchemaObject, name: string): IRType {
    const values = schema.enum ?? [];
    const enumValues: IREnumValue[] = values.map((value) => ({
      name: toEnumMemberName(value as string | number),
      value: value as string | number,
    }));

    // Deduplicate enum member names
    const seenNames = new Set<string>();
    for (const ev of enumValues) {
      let uniqueName = ev.name;
      let counter = 1;
      while (seenNames.has(uniqueName)) {
        uniqueName = `${ev.name}${counter}`;
        counter++;
      }
      seenNames.add(uniqueName);
      ev.name = uniqueName;
    }

    return createEnumType(name, enumValues, {
      description: schema.description,
      deprecated: schema.deprecated,
    });
  }

  /**
   * Convert a primitive schema
   */
  private convertPrimitiveSchema(schema: SchemaObject, name: string, kind: IRTypeKind): IRType {
    const mappedKind = this.mapPrimitiveType(kind as string);

    return {
      name,
      kind: mappedKind,
      description: schema.description,
      deprecated: schema.deprecated,
      format: schema.format,
      default: schema.default,
      // String constraints
      minLength: schema.minLength,
      maxLength: schema.maxLength,
      pattern: schema.pattern,
      // Numeric constraints
      minimum: schema.minimum,
      maximum: schema.maximum,
      exclusiveMinimum:
        typeof schema.exclusiveMinimum === 'number' ? schema.exclusiveMinimum : undefined,
      exclusiveMaximum:
        typeof schema.exclusiveMaximum === 'number' ? schema.exclusiveMaximum : undefined,
    };
  }

  /**
   * Get the type of a schema
   */
  private getSchemaType(schema: SchemaObject): string {
    const mixed = asMixed(schema);
    if (mixed.type) {
      // Handle OpenAPI 3.1 type arrays
      if (Array.isArray(mixed.type)) {
        // Filter out null from the array
        const types = mixed.type.filter((t) => t !== 'null');
        return types[0] ?? 'any';
      }
      return mixed.type;
    }

    // Infer type from other properties
    if (mixed.properties || mixed.additionalProperties) {
      return 'object';
    }
    if (mixed.items) {
      return 'array';
    }
    if (mixed.enum) {
      return 'string';
    }

    return 'any';
  }

  /**
   * Check if a schema is nullable
   */
  private isNullable(schema: SchemaOrRef): boolean {
    if (isReference(schema)) {
      return false;
    }

    const mixed = asMixed(schema);

    // OpenAPI 3.0 style
    if (mixed.nullable) {
      return true;
    }

    // OpenAPI 3.1 style
    if (Array.isArray(mixed.type)) {
      return mixed.type.includes('null');
    }

    return false;
  }

  /**
   * Check if a type is a primitive type
   */
  private isPrimitiveType(type: string): boolean {
    return ['string', 'number', 'integer', 'boolean', 'null'].includes(type);
  }

  /**
   * Map OpenAPI type to IR type kind
   */
  private mapPrimitiveType(type: string): IRTypeKind {
    switch (type) {
      case 'string':
        return 'string';
      case 'number':
        return 'number';
      case 'integer':
        return 'integer';
      case 'boolean':
        return 'boolean';
      case 'null':
        return 'null';
      default:
        return 'any';
    }
  }

  /**
   * Generate a unique name for an inline type
   */
  private generateInlineTypeName(contextName: string): string {
    this.inlineTypeCounter++;
    return `${sanitizeIdentifier(contextName)}Inline${this.inlineTypeCounter}`;
  }
}
