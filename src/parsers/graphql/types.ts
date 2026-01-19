/**
 * GraphQL-specific types for parsing
 */

import type {
  GraphQLSchema,
  GraphQLType,
  GraphQLObjectType,
  GraphQLInputObjectType,
  GraphQLEnumType,
  GraphQLUnionType,
  GraphQLInterfaceType,
  GraphQLScalarType,
  GraphQLList,
  GraphQLNonNull,
} from 'graphql';

/** Parser options */
export interface GraphQLParserOptions {
  /** Whether to include deprecated types and fields */
  includeDeprecated?: boolean;
  /** Custom scalar mappings */
  scalarMappings?: Record<string, string>;
  /** Operations file pattern to look for */
  operationsPattern?: string;
}

/** Parser context for tracking state during parsing */
export interface GraphQLParserContext {
  /** The parsed schema */
  schema: GraphQLSchema;
  /** Types that have been processed */
  processedTypes: Set<string>;
  /** Parser options */
  options: GraphQLParserOptions;
}

/** Built-in scalar types and their TypeScript mappings */
export const BUILTIN_SCALARS: Record<string, string> = {
  String: 'string',
  Int: 'number',
  Float: 'number',
  Boolean: 'boolean',
  ID: 'string',
};

/** Default custom scalar mappings */
export const DEFAULT_SCALAR_MAPPINGS: Record<string, string> = {
  DateTime: 'string',
  Date: 'string',
  Time: 'string',
  JSON: 'unknown',
  JSONObject: 'Record<string, unknown>',
  Upload: 'File',
  BigInt: 'bigint',
  Decimal: 'string',
};

/** Type guard for GraphQL object type */
export function isObjectType(type: GraphQLType): type is GraphQLObjectType {
  return type.constructor.name === 'GraphQLObjectType';
}

/** Type guard for GraphQL input object type */
export function isInputObjectType(type: GraphQLType): type is GraphQLInputObjectType {
  return type.constructor.name === 'GraphQLInputObjectType';
}

/** Type guard for GraphQL enum type */
export function isEnumType(type: GraphQLType): type is GraphQLEnumType {
  return type.constructor.name === 'GraphQLEnumType';
}

/** Type guard for GraphQL union type */
export function isUnionType(type: GraphQLType): type is GraphQLUnionType {
  return type.constructor.name === 'GraphQLUnionType';
}

/** Type guard for GraphQL interface type */
export function isInterfaceType(type: GraphQLType): type is GraphQLInterfaceType {
  return type.constructor.name === 'GraphQLInterfaceType';
}

/** Type guard for GraphQL scalar type */
export function isScalarType(type: GraphQLType): type is GraphQLScalarType {
  return type.constructor.name === 'GraphQLScalarType';
}

/** Type guard for GraphQL list type */
export function isListType(type: GraphQLType): type is GraphQLList<GraphQLType> {
  return type.constructor.name === 'GraphQLList';
}

/** Type guard for GraphQL non-null type */
export function isNonNullType(type: GraphQLType): type is GraphQLNonNull<GraphQLType> {
  return type.constructor.name === 'GraphQLNonNull';
}

/** Get the named type from a wrapped type */
export function getNamedType(type: GraphQLType): GraphQLType {
  if (isListType(type) || isNonNullType(type)) {
    return getNamedType(type.ofType);
  }
  return type;
}

/** Check if a type is built-in */
export function isBuiltinType(typeName: string): boolean {
  return typeName.startsWith('__') || Object.keys(BUILTIN_SCALARS).includes(typeName);
}
