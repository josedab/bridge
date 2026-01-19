/**
 * GraphQL Parser - Parses GraphQL schemas into IR schema
 */

import {
  buildSchema,
  type GraphQLSchema,
  type GraphQLType,
  type GraphQLField,
  type GraphQLInputField,
  type GraphQLEnumValue,
  type GraphQLObjectType,
  type GraphQLInputObjectType,
  type GraphQLEnumType,
  type GraphQLUnionType,
  type GraphQLInterfaceType,
  type GraphQLScalarType,
} from 'graphql';
import type {
  IRSchema,
  IRMetadata,
  IRType,
  IRTypeRef,
  IRProperty,
  IREnumValue,
} from '../../ir/types.js';
import {
  createIRSchema,
  createPrimitiveRef,
  createTypeRef,
  createInlineTypeRef,
} from '../../ir/types.js';
import { ParseError } from '../../errors.js';
import { readFile } from '../../utils/fs.js';
import { logger } from '../../utils/logger.js';
import {
  type GraphQLParserOptions,
  type GraphQLParserContext,
  BUILTIN_SCALARS,
  DEFAULT_SCALAR_MAPPINGS,
  isObjectType,
  isInputObjectType,
  isEnumType,
  isUnionType,
  isInterfaceType,
  isScalarType,
  isListType,
  isNonNullType,
  isBuiltinType,
} from './types.js';

/**
 * Parse a GraphQL schema file and return an IR schema
 */
export async function parseGraphQL(
  inputPath: string,
  options: GraphQLParserOptions = {}
): Promise<IRSchema> {
  const parser = new GraphQLParser(inputPath, options);
  return parser.parse();
}

/**
 * Parse a GraphQL schema string directly
 */
export function parseGraphQLSchema(
  schemaSource: string,
  options: GraphQLParserOptions = {}
): IRSchema {
  const parser = new GraphQLParser('', options);
  return parser.parseSchema(schemaSource);
}

/**
 * GraphQL Parser class
 */
export class GraphQLParser {
  private schema!: GraphQLSchema;
  private context!: GraphQLParserContext;
  private types: Map<string, IRType> = new Map();
  private scalarMappings: Record<string, string>;

  constructor(
    private inputPath: string,
    private options: GraphQLParserOptions = {}
  ) {
    this.scalarMappings = {
      ...BUILTIN_SCALARS,
      ...DEFAULT_SCALAR_MAPPINGS,
      ...options.scalarMappings,
    };
  }

  /**
   * Parse the GraphQL schema
   */
  async parse(): Promise<IRSchema> {
    const schemaSource = readFile(this.inputPath);
    return this.parseSchema(schemaSource);
  }

  /**
   * Parse a schema from source string
   */
  parseSchema(schemaSource: string): IRSchema {
    try {
      this.schema = buildSchema(schemaSource);
    } catch (error) {
      throw new ParseError(
        `Failed to parse GraphQL schema: ${(error as Error).message}`,
        this.inputPath
      );
    }

    // Initialize context
    this.context = {
      schema: this.schema,
      processedTypes: new Set(),
      options: this.options,
    };

    // Parse metadata
    const metadata = this.parseMetadata();

    // Parse types
    this.parseTypes();

    return createIRSchema(metadata, this.types, [], []);
  }

  /**
   * Parse schema metadata
   */
  private parseMetadata(): IRMetadata {
    // Query type available via this.schema.getQueryType() if needed

    return {
      title: 'GraphQL API',
      version: '1.0.0',
      description: this.schema.description ?? undefined,
      source: 'graphql',
    };
  }

  /**
   * Parse all types from the schema
   */
  private parseTypes(): void {
    const typeMap = this.schema.getTypeMap();

    for (const [name, type] of Object.entries(typeMap)) {
      // Skip built-in types
      if (isBuiltinType(name)) continue;

      // Skip already processed types
      if (this.context.processedTypes.has(name)) continue;
      this.context.processedTypes.add(name);

      const irType = this.convertType(type);
      if (irType) {
        this.types.set(name, irType);
        logger.debug(`Parsed type: ${name}`);
      }
    }
  }

  /**
   * Convert a GraphQL type to IR type
   */
  private convertType(type: GraphQLType): IRType | null {
    if (isObjectType(type)) {
      return this.convertObjectType(type);
    }

    if (isInputObjectType(type)) {
      return this.convertInputObjectType(type);
    }

    if (isEnumType(type)) {
      return this.convertEnumType(type);
    }

    if (isUnionType(type)) {
      return this.convertUnionType(type);
    }

    if (isInterfaceType(type)) {
      return this.convertInterfaceType(type);
    }

    if (isScalarType(type)) {
      return this.convertScalarType(type);
    }

    return null;
  }

  /**
   * Convert a GraphQL object type
   */
  private convertObjectType(type: GraphQLObjectType): IRType {
    const fields = type.getFields();
    const properties: IRProperty[] = [];

    for (const [_fieldName, field] of Object.entries(fields)) {
      properties.push(this.convertField(field as GraphQLField<unknown, unknown>));
    }

    return {
      name: type.name,
      kind: 'object',
      description: type.description ?? undefined,
      properties,
    };
  }

  /**
   * Convert a GraphQL input object type
   */
  private convertInputObjectType(type: GraphQLInputObjectType): IRType {
    const fields = type.getFields();
    const properties: IRProperty[] = [];

    for (const [_fieldName, field] of Object.entries(fields)) {
      properties.push(this.convertInputField(field as GraphQLInputField));
    }

    return {
      name: type.name,
      kind: 'object',
      description: type.description ?? undefined,
      properties,
    };
  }

  /**
   * Convert a field to IR property
   */
  private convertField(field: GraphQLField<unknown, unknown>): IRProperty {
    const typeRef = this.convertTypeToRef(field.type);
    const isNonNull = isNonNullType(field.type);

    return {
      name: field.name,
      type: typeRef,
      required: isNonNull,
      description: field.description ?? undefined,
      deprecated: field.deprecationReason !== undefined,
    };
  }

  /**
   * Convert an input field to IR property
   */
  private convertInputField(field: GraphQLInputField): IRProperty {
    const typeRef = this.convertTypeToRef(field.type);
    const isNonNull = isNonNullType(field.type);

    return {
      name: field.name,
      type: typeRef,
      required: isNonNull,
      description: field.description ?? undefined,
      default: field.defaultValue,
    };
  }

  /**
   * Convert a GraphQL type to IR type reference
   */
  private convertTypeToRef(type: GraphQLType): IRTypeRef {
    // Handle non-null wrapper
    if (isNonNullType(type)) {
      const innerRef = this.convertTypeToRef(type.ofType);
      return { ...innerRef, nullable: false };
    }

    // Handle list wrapper
    if (isListType(type)) {
      const itemRef = this.convertTypeToRef(type.ofType);
      return createInlineTypeRef(
        {
          name: 'List',
          kind: 'array',
          items: itemRef,
        },
        true
      );
    }

    // Handle named types
    const namedType = type as
      | GraphQLObjectType
      | GraphQLInputObjectType
      | GraphQLEnumType
      | GraphQLUnionType
      | GraphQLInterfaceType
      | GraphQLScalarType;
    const typeName = namedType.name;

    // Check for scalar mappings
    if (this.scalarMappings[typeName]) {
      const tsType = this.scalarMappings[typeName];
      const kind =
        tsType === 'number'
          ? 'number'
          : tsType === 'boolean'
            ? 'boolean'
            : tsType === 'string'
              ? 'string'
              : 'any';
      return createPrimitiveRef(kind, true);
    }

    // Reference to named type
    return createTypeRef(typeName, true);
  }

  /**
   * Convert a GraphQL enum type
   */
  private convertEnumType(type: GraphQLEnumType): IRType {
    const values = type.getValues();
    const enumValues: IREnumValue[] = values.map((v: GraphQLEnumValue) => ({
      name: v.name,
      value: v.value as string,
      description: v.description ?? undefined,
      deprecated: v.deprecationReason !== undefined,
    }));

    return {
      name: type.name,
      kind: 'enum',
      description: type.description ?? undefined,
      enumValues,
    };
  }

  /**
   * Convert a GraphQL union type
   */
  private convertUnionType(type: GraphQLUnionType): IRType {
    const memberTypes = type.getTypes();
    const variants: IRTypeRef[] = memberTypes.map((t) => createTypeRef(t.name, false));

    return {
      name: type.name,
      kind: 'union',
      description: type.description ?? undefined,
      variants,
    };
  }

  /**
   * Convert a GraphQL interface type
   */
  private convertInterfaceType(type: GraphQLInterfaceType): IRType {
    const fields = type.getFields();
    const properties: IRProperty[] = [];

    for (const [_fieldName, field] of Object.entries(fields)) {
      properties.push(this.convertField(field as GraphQLField<unknown, unknown>));
    }

    return {
      name: type.name,
      kind: 'object',
      description: type.description ?? undefined,
      properties,
    };
  }

  /**
   * Convert a GraphQL scalar type (custom scalars)
   */
  private convertScalarType(type: GraphQLScalarType): IRType | null {
    // Skip built-in scalars
    if (BUILTIN_SCALARS[type.name]) {
      return null;
    }

    // Custom scalar - map to the configured type or default to unknown
    const mapping = this.scalarMappings[type.name] ?? 'unknown';

    return {
      name: type.name,
      kind:
        mapping === 'number'
          ? 'number'
          : mapping === 'boolean'
            ? 'boolean'
            : mapping === 'string'
              ? 'string'
              : 'any',
      description: type.description ?? undefined,
    };
  }
}
