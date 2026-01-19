/**
 * Intermediate Representation (IR) Types
 *
 * These types form the core data structure that bridges input schemas (OpenAPI, GraphQL)
 * with output generators (TypeScript, Zod, React Query, etc.).
 */

/** Root schema containing all parsed API information */
export interface IRSchema {
  metadata: IRMetadata;
  types: Map<string, IRType>;
  endpoints: IREndpoint[];
  operations: IROperation[];
  securitySchemes?: Map<string, IRSecurityScheme>;
}

/** API metadata extracted from source schema */
export interface IRMetadata {
  title: string;
  version: string;
  description?: string;
  baseUrl?: string;
  source: 'openapi' | 'graphql';
}

/** Supported type kinds in the IR */
export type IRTypeKind =
  | 'object'
  | 'array'
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'null'
  | 'enum'
  | 'union'
  | 'intersection'
  | 'literal'
  | 'any'
  | 'unknown'
  | 'void'
  | 'date'
  | 'datetime'
  | 'binary'
  | 'file';

/** Unified type representation */
export interface IRType {
  name: string;
  kind: IRTypeKind;
  description?: string;
  deprecated?: boolean;

  /** For object types - list of properties */
  properties?: IRProperty[];

  /** For array types - item type */
  items?: IRTypeRef;

  /** For union types (oneOf) */
  variants?: IRTypeRef[];

  /** For intersection types (allOf) */
  members?: IRTypeRef[];

  /** For discriminated unions */
  discriminator?: IRDiscriminator;

  /** For enum types */
  enumValues?: IREnumValue[];

  /** For object types with dynamic keys */
  additionalProperties?: IRTypeRef | boolean;

  /** For literal types */
  literalValue?: string | number | boolean;

  /** String format constraints */
  format?: string;

  /** Numeric constraints */
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;

  /** String constraints */
  minLength?: number;
  maxLength?: number;
  pattern?: string;

  /** Array constraints */
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;

  /** Default value */
  default?: unknown;
}

/** Property definition for object types */
export interface IRProperty {
  name: string;
  type: IRTypeRef;
  required: boolean;
  description?: string;
  deprecated?: boolean;
  default?: unknown;
  readonly?: boolean;
  writeonly?: boolean;
}

/** Reference to a type - either named reference or inline type */
export interface IRTypeRef {
  kind: 'reference' | 'inline' | 'primitive';

  /** For references - name of the referenced type */
  name?: string;

  /** For inline types - the type definition */
  inlineType?: IRType;

  /** For primitive types - the kind */
  primitiveKind?: IRTypeKind;

  /** Whether this type can be null */
  nullable?: boolean;
}

/** Discriminator for tagged unions */
export interface IRDiscriminator {
  propertyName: string;
  mapping?: Map<string, string>;
}

/** Enum value definition */
export interface IREnumValue {
  name: string;
  value: string | number;
  description?: string;
  deprecated?: boolean;
}

/** REST endpoint definition */
export interface IREndpoint {
  operationId: string;
  method: IRHttpMethod;
  path: string;
  summary?: string;
  description?: string;
  deprecated?: boolean;
  tags?: string[];
  parameters: IRParameter[];
  requestBody?: IRRequestBody;
  responses: IRResponse[];
  security?: IRSecurityRequirement[];
}

/** HTTP methods */
export type IRHttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options';

/** Parameter location in HTTP request */
export type IRParameterLocation = 'path' | 'query' | 'header' | 'cookie';

/** Parameter definition */
export interface IRParameter {
  name: string;
  in: IRParameterLocation;
  type: IRTypeRef;
  required: boolean;
  description?: string;
  deprecated?: boolean;
  default?: unknown;
  style?: string;
  explode?: boolean;
}

/** Request body definition */
export interface IRRequestBody {
  description?: string;
  required: boolean;
  content: IRMediaTypeContent[];
}

/** Media type content */
export interface IRMediaTypeContent {
  mediaType: string;
  schema: IRTypeRef;
}

/** Response definition */
export interface IRResponse {
  statusCode: string;
  description: string;
  content?: IRMediaTypeContent[];
  headers?: IRResponseHeader[];
}

/** Response header definition */
export interface IRResponseHeader {
  name: string;
  type: IRTypeRef;
  description?: string;
  required?: boolean;
}

/** Security requirement */
export interface IRSecurityRequirement {
  name: string;
  scopes: string[];
}

/** Security scheme type */
export type IRSecuritySchemeType = 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';

/** API Key location */
export type IRApiKeyLocation = 'query' | 'header' | 'cookie';

/** HTTP authentication scheme */
export type IRHttpScheme =
  | 'basic'
  | 'bearer'
  | 'digest'
  | 'hoba'
  | 'mutual'
  | 'negotiate'
  | 'oauth'
  | 'scram-sha-1'
  | 'scram-sha-256'
  | 'vapid';

/** OAuth2 flow type */
export type IROAuth2FlowType = 'implicit' | 'password' | 'clientCredentials' | 'authorizationCode';

/** OAuth2 flow definition */
export interface IROAuth2Flow {
  type: IROAuth2FlowType;
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  scopes: Map<string, string>;
}

/** Security scheme definition */
export interface IRSecurityScheme {
  name: string;
  type: IRSecuritySchemeType;
  description?: string;

  /** For apiKey type */
  apiKeyName?: string;
  apiKeyIn?: IRApiKeyLocation;

  /** For http type */
  httpScheme?: IRHttpScheme;
  bearerFormat?: string;

  /** For oauth2 type */
  oauth2Flows?: IROAuth2Flow[];

  /** For openIdConnect type */
  openIdConnectUrl?: string;
}

/** GraphQL operation definition */
export interface IROperation {
  name: string;
  kind: 'query' | 'mutation' | 'subscription';
  variables: IRVariable[];
  returnType: IRTypeRef;
  description?: string;
  deprecated?: boolean;
  document?: string;
}

/** GraphQL variable definition */
export interface IRVariable {
  name: string;
  type: IRTypeRef;
  default?: unknown;
  description?: string;
}

/** Helper functions for creating IR types */
export function createIRSchema(
  metadata: IRMetadata,
  types?: Map<string, IRType>,
  endpoints?: IREndpoint[],
  operations?: IROperation[],
  securitySchemes?: Map<string, IRSecurityScheme>
): IRSchema {
  return {
    metadata,
    types: types ?? new Map(),
    endpoints: endpoints ?? [],
    operations: operations ?? [],
    securitySchemes: securitySchemes ?? new Map(),
  };
}

export function createPrimitiveRef(kind: IRTypeKind, nullable = false): IRTypeRef {
  return {
    kind: 'primitive',
    primitiveKind: kind,
    nullable,
  };
}

export function createTypeRef(name: string, nullable = false): IRTypeRef {
  return {
    kind: 'reference',
    name,
    nullable,
  };
}

export function createInlineTypeRef(type: IRType, nullable = false): IRTypeRef {
  return {
    kind: 'inline',
    inlineType: type,
    nullable,
  };
}

export function createObjectType(
  name: string,
  properties: IRProperty[],
  options: Partial<Omit<IRType, 'name' | 'kind' | 'properties'>> = {}
): IRType {
  return {
    name,
    kind: 'object',
    properties,
    ...options,
  };
}

export function createArrayType(
  name: string,
  items: IRTypeRef,
  options: Partial<Omit<IRType, 'name' | 'kind' | 'items'>> = {}
): IRType {
  return {
    name,
    kind: 'array',
    items,
    ...options,
  };
}

export function createUnionType(
  name: string,
  variants: IRTypeRef[],
  discriminator?: IRDiscriminator,
  options: Partial<Omit<IRType, 'name' | 'kind' | 'variants' | 'discriminator'>> = {}
): IRType {
  return {
    name,
    kind: 'union',
    variants,
    discriminator,
    ...options,
  };
}

export function createIntersectionType(
  name: string,
  members: IRTypeRef[],
  options: Partial<Omit<IRType, 'name' | 'kind' | 'members'>> = {}
): IRType {
  return {
    name,
    kind: 'intersection',
    members,
    ...options,
  };
}

export function createEnumType(
  name: string,
  enumValues: IREnumValue[],
  options: Partial<Omit<IRType, 'name' | 'kind' | 'enumValues'>> = {}
): IRType {
  return {
    name,
    kind: 'enum',
    enumValues,
    ...options,
  };
}
