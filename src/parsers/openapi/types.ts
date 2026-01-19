/**
 * OpenAPI-specific types for parsing
 */

import type { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';

/** Supported OpenAPI document types */
export type OpenAPIDocument = OpenAPIV3.Document | OpenAPIV3_1.Document;

/** Schema object type */
export type SchemaObject = OpenAPIV3.SchemaObject | OpenAPIV3_1.SchemaObject;

/** Mixed schema type that allows accessing any schema property */
export interface MixedSchemaObject {
  type?: string | string[];
  items?: SchemaObject | ReferenceObject;
  nullable?: boolean;
  properties?: Record<string, SchemaObject | ReferenceObject>;
  additionalProperties?: boolean | SchemaObject | ReferenceObject;
  required?: string[];
  enum?: unknown[];
  oneOf?: Array<SchemaObject | ReferenceObject>;
  anyOf?: Array<SchemaObject | ReferenceObject>;
  allOf?: Array<SchemaObject | ReferenceObject>;
  description?: string;
  deprecated?: boolean;
  default?: unknown;
  format?: string;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number | boolean;
  exclusiveMaximum?: number | boolean;
  discriminator?: { propertyName: string; mapping?: Record<string, string> };
}

/** Reference object type */
export type ReferenceObject = OpenAPIV3.ReferenceObject | OpenAPIV3_1.ReferenceObject;

/** Schema or reference */
export type SchemaOrRef = SchemaObject | ReferenceObject;

/** Parameter object */
export type ParameterObject = OpenAPIV3.ParameterObject | OpenAPIV3_1.ParameterObject;

/** Request body object */
export type RequestBodyObject = OpenAPIV3.RequestBodyObject | OpenAPIV3_1.RequestBodyObject;

/** Response object */
export type ResponseObject = OpenAPIV3.ResponseObject | OpenAPIV3_1.ResponseObject;

/** Operation object */
export type OperationObject = OpenAPIV3.OperationObject | OpenAPIV3_1.OperationObject;

/** Path item object */
export type PathItemObject = OpenAPIV3.PathItemObject | OpenAPIV3_1.PathItemObject;

/** Media type object */
export type MediaTypeObject = OpenAPIV3.MediaTypeObject | OpenAPIV3_1.MediaTypeObject;

/** Header object */
export type HeaderObject = OpenAPIV3.HeaderObject | OpenAPIV3_1.HeaderObject;

/** HTTP methods supported */
export const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const;

export type HttpMethod = (typeof HTTP_METHODS)[number];

/** Check if an object is a reference */
export function isReference(obj: unknown): obj is ReferenceObject {
  return typeof obj === 'object' && obj !== null && '$ref' in obj;
}

/** Check if a string is an HTTP method */
export function isHttpMethod(method: string): method is HttpMethod {
  return HTTP_METHODS.includes(method as HttpMethod);
}

/** Parser options */
export interface OpenAPIParserOptions {
  /** Whether to resolve external references */
  resolveExternalRefs?: boolean;
  /** Base path for resolving external references */
  basePath?: string;
  /** Whether to validate the schema */
  validate?: boolean;
}

/** Parser context for tracking state during parsing */
export interface OpenAPIParserContext {
  /** The root document */
  document: OpenAPIDocument;
  /** Current file path */
  filePath: string;
  /** Types that have been processed */
  processedTypes: Set<string>;
  /** Circular reference tracking */
  circularRefs: Set<string>;
  /** Parser options */
  options: OpenAPIParserOptions;
}
