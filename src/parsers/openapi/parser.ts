/**
 * OpenAPI Parser - Parses OpenAPI 3.0/3.1 specifications into IR schema
 */

import { parse as parseYaml } from 'yaml';
import type {
  IRSchema,
  IRMetadata,
  IRType,
  IREndpoint,
  IRParameter,
  IRRequestBody,
  IRResponse,
  IRMediaTypeContent,
  IRHttpMethod,
  IRParameterLocation,
} from '../../ir/types.js';
import { createIRSchema } from '../../ir/types.js';
import { ParseError } from '../../errors.js';
import { readFile, getExtension } from '../../utils/fs.js';
import { logger } from '../../utils/logger.js';
import { toOperationName, pascalCase } from '../../utils/naming.js';
import { RefResolver } from './ref-resolver.js';
import { SchemaConverter } from './schema-converter.js';
import type {
  OpenAPIDocument,
  SchemaObject,
  SchemaOrRef,
  ParameterObject,
  RequestBodyObject,
  ResponseObject,
  OperationObject,
  PathItemObject,
  MediaTypeObject,
  OpenAPIParserOptions,
  OpenAPIParserContext,
} from './types.js';
import { isReference, HTTP_METHODS } from './types.js';

/**
 * Parse an OpenAPI specification file and return an IR schema
 */
export async function parseOpenAPI(
  inputPath: string,
  options: OpenAPIParserOptions = {}
): Promise<IRSchema> {
  const parser = new OpenAPIParser(inputPath, options);
  return parser.parse();
}

/**
 * Parse an OpenAPI document object directly
 */
export function parseOpenAPIDocument(
  document: OpenAPIDocument,
  options: OpenAPIParserOptions = {}
): IRSchema {
  const parser = new OpenAPIParser('', { ...options, document });
  return parser.parseDocument(document);
}

/** Parser options with document */
interface ParserOptionsWithDoc extends OpenAPIParserOptions {
  document?: OpenAPIDocument;
}

/**
 * OpenAPI Parser class
 */
export class OpenAPIParser {
  private document!: OpenAPIDocument;
  private context!: OpenAPIParserContext;
  private resolver!: RefResolver;
  private schemaConverter!: SchemaConverter;
  private types: Map<string, IRType> = new Map();
  private endpoints: IREndpoint[] = [];

  constructor(
    private inputPath: string,
    private options: ParserOptionsWithDoc = {}
  ) {}

  /**
   * Parse the OpenAPI specification
   */
  async parse(): Promise<IRSchema> {
    // Load and parse the document
    this.document = await this.loadDocument();
    return this.parseDocument(this.document);
  }

  /**
   * Parse an already loaded document
   */
  parseDocument(document: OpenAPIDocument): IRSchema {
    this.document = document;

    // Initialize context
    this.context = {
      document: this.document,
      filePath: this.inputPath,
      processedTypes: new Set(),
      circularRefs: new Set(),
      options: this.options,
    };

    // Initialize resolver and converter
    this.resolver = new RefResolver(this.document, this.inputPath);
    this.schemaConverter = new SchemaConverter(this.resolver);

    // Parse metadata
    const metadata = this.parseMetadata();

    // Parse components/schemas
    this.parseSchemas();

    // Parse paths
    this.parsePaths();

    return createIRSchema(metadata, this.types, this.endpoints, []);
  }

  /**
   * Load the OpenAPI document from file
   */
  private async loadDocument(): Promise<OpenAPIDocument> {
    // Check if document was provided in options
    if (this.options.document) {
      return this.options.document;
    }

    const content = readFile(this.inputPath);
    const extension = getExtension(this.inputPath);

    try {
      if (extension === '.json') {
        return JSON.parse(content) as OpenAPIDocument;
      } else if (extension === '.yaml' || extension === '.yml') {
        return parseYaml(content) as OpenAPIDocument;
      } else {
        throw new ParseError(`Unsupported file extension: ${extension}`, this.inputPath);
      }
    } catch (error) {
      if (error instanceof ParseError) throw error;
      throw new ParseError(
        `Failed to parse OpenAPI document: ${(error as Error).message}`,
        this.inputPath
      );
    }
  }

  /**
   * Parse API metadata
   */
  private parseMetadata(): IRMetadata {
    const info = this.document.info;

    // Get base URL from servers
    let baseUrl: string | undefined;
    if (this.document.servers && this.document.servers.length > 0) {
      baseUrl = this.document.servers[0]?.url;
    }

    return {
      title: info.title,
      version: info.version,
      description: info.description,
      baseUrl,
      source: 'openapi',
    };
  }

  /**
   * Parse component schemas
   */
  private parseSchemas(): void {
    const schemas = this.document.components?.schemas;
    if (!schemas) return;

    for (const [name, schema] of Object.entries(schemas)) {
      if (this.context.processedTypes.has(name)) continue;
      this.context.processedTypes.add(name);

      const irType = this.schemaConverter.convertSchema(schema as SchemaOrRef, name);
      this.types.set(name, irType);

      logger.debug(`Parsed schema: ${name}`);
    }
  }

  /**
   * Parse API paths
   */
  private parsePaths(): void {
    const paths = this.document.paths;
    if (!paths) return;

    for (const [path, pathItem] of Object.entries(paths)) {
      if (!pathItem) continue;

      // Handle path-level parameters
      const pathParams = this.parseParameters((pathItem as PathItemObject).parameters ?? []);

      // Parse operations for each HTTP method
      for (const method of HTTP_METHODS) {
        const operation = (pathItem as PathItemObject)[method] as OperationObject | undefined;
        if (!operation) continue;

        const endpoint = this.parseOperation(operation, method, path, pathParams);
        this.endpoints.push(endpoint);

        logger.debug(`Parsed endpoint: ${method.toUpperCase()} ${path}`);
      }
    }
  }

  /**
   * Parse an operation
   */
  private parseOperation(
    operation: OperationObject,
    method: string,
    path: string,
    pathParams: IRParameter[]
  ): IREndpoint {
    // Generate operation ID if not provided
    const operationId = operation.operationId ?? toOperationName(method, path);

    // Parse operation parameters and merge with path parameters
    const operationParams = this.parseParameters(operation.parameters ?? []);
    const allParams = this.mergeParameters(pathParams, operationParams);

    // Parse request body
    const requestBody = operation.requestBody
      ? this.parseRequestBody(operation.requestBody, operationId)
      : undefined;

    // Parse responses
    const responses = this.parseResponses(operation.responses ?? {}, operationId);

    return {
      operationId,
      method: method as IRHttpMethod,
      path,
      summary: operation.summary,
      description: operation.description,
      deprecated: operation.deprecated,
      tags: operation.tags,
      parameters: allParams,
      requestBody,
      responses,
    };
  }

  /**
   * Parse parameters
   */
  private parseParameters(parameters: Array<ParameterObject | { $ref: string }>): IRParameter[] {
    return parameters.map((param) => {
      // Resolve reference if needed
      if (isReference(param)) {
        const { value } = this.resolver.resolveIfRef<ParameterObject>(param);
        param = value;
      }

      const paramObj = param as ParameterObject;
      const schema = paramObj.schema as SchemaOrRef | undefined;

      return {
        name: paramObj.name,
        in: paramObj.in as IRParameterLocation,
        type: schema
          ? this.schemaConverter.convertToTypeRef(schema, `${pascalCase(paramObj.name)}Param`)
          : { kind: 'primitive' as const, primitiveKind: 'string' as const },
        required: paramObj.required ?? paramObj.in === 'path',
        description: paramObj.description,
        deprecated: paramObj.deprecated,
        default: paramObj.schema ? (paramObj.schema as SchemaObject).default : undefined,
        style: paramObj.style,
        explode: paramObj.explode,
      };
    });
  }

  /**
   * Merge path-level and operation-level parameters
   */
  private mergeParameters(
    pathParams: IRParameter[],
    operationParams: IRParameter[]
  ): IRParameter[] {
    const result = [...pathParams];
    const pathParamNames = new Set(pathParams.map((p) => `${p.in}:${p.name}`));

    for (const param of operationParams) {
      const key = `${param.in}:${param.name}`;
      if (pathParamNames.has(key)) {
        // Override path-level parameter
        const index = result.findIndex((p) => `${p.in}:${p.name}` === key);
        if (index !== -1) {
          result[index] = param;
        }
      } else {
        result.push(param);
      }
    }

    return result;
  }

  /**
   * Parse request body
   */
  private parseRequestBody(
    requestBody: RequestBodyObject | { $ref: string },
    operationId: string
  ): IRRequestBody {
    // Resolve reference if needed
    if (isReference(requestBody)) {
      const { value } = this.resolver.resolveIfRef<RequestBodyObject>(requestBody);
      requestBody = value;
    }

    const bodyObj = requestBody as RequestBodyObject;
    const content = this.parseMediaTypeContent(
      bodyObj.content ?? {},
      `${pascalCase(operationId)}Request`
    );

    return {
      description: bodyObj.description,
      required: bodyObj.required ?? false,
      content,
    };
  }

  /**
   * Parse responses
   */
  private parseResponses(
    responses: Record<string, ResponseObject | { $ref: string }>,
    operationId: string
  ): IRResponse[] {
    const result: IRResponse[] = [];

    for (const [statusCode, response] of Object.entries(responses)) {
      // Resolve reference if needed
      let responseObj: ResponseObject;
      if (isReference(response)) {
        const { value } = this.resolver.resolveIfRef<ResponseObject>(response);
        responseObj = value;
      } else {
        responseObj = response as ResponseObject;
      }

      const content = responseObj.content
        ? this.parseMediaTypeContent(
            responseObj.content,
            `${pascalCase(operationId)}Response${statusCode}`
          )
        : undefined;

      result.push({
        statusCode,
        description: responseObj.description,
        content,
      });
    }

    return result;
  }

  /**
   * Parse media type content
   */
  private parseMediaTypeContent(
    content: Record<string, MediaTypeObject>,
    baseName: string
  ): IRMediaTypeContent[] {
    const result: IRMediaTypeContent[] = [];

    for (const [mediaType, mediaTypeObj] of Object.entries(content)) {
      if (!mediaTypeObj.schema) continue;

      const schema = this.schemaConverter.convertToTypeRef(
        mediaTypeObj.schema as SchemaOrRef,
        `${baseName}${this.mediaTypeToName(mediaType)}`
      );

      result.push({
        mediaType,
        schema,
      });
    }

    return result;
  }

  /**
   * Convert media type to a safe name suffix
   */
  private mediaTypeToName(mediaType: string): string {
    if (mediaType === 'application/json') return '';
    if (mediaType === 'application/xml') return 'Xml';
    if (mediaType.startsWith('text/')) return 'Text';
    if (mediaType.includes('form')) return 'Form';
    return pascalCase(mediaType.replace(/[^a-zA-Z0-9]/g, ' '));
  }
}
