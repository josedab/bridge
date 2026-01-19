import type { IRSchema, IRType, IRTypeRef, IREndpoint, IROperation } from './types.js';

/** Validation error from IR schema validation */
export interface IRValidationError {
  path: string;
  message: string;
}

/** Validation result */
export interface ValidationResult {
  valid: boolean;
  errors: IRValidationError[];
}

/**
 * Validates an IR schema for consistency and completeness
 */
export function validateIRSchema(schema: IRSchema): ValidationResult {
  const errors: IRValidationError[] = [];

  // Validate metadata
  if (!schema.metadata.title) {
    errors.push({ path: 'metadata.title', message: 'Title is required' });
  }
  if (!schema.metadata.version) {
    errors.push({ path: 'metadata.version', message: 'Version is required' });
  }
  if (!['openapi', 'graphql'].includes(schema.metadata.source)) {
    errors.push({
      path: 'metadata.source',
      message: 'Source must be "openapi" or "graphql"',
    });
  }

  // Validate type references
  const typeNames = new Set(schema.types.keys());

  for (const [name, type] of schema.types) {
    validateType(type, `types.${name}`, typeNames, errors);
  }

  // Validate endpoints
  for (let i = 0; i < schema.endpoints.length; i++) {
    validateEndpoint(schema.endpoints[i]!, `endpoints[${i}]`, typeNames, errors);
  }

  // Validate operations
  for (let i = 0; i < schema.operations.length; i++) {
    validateOperation(schema.operations[i]!, `operations[${i}]`, typeNames, errors);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function validateType(
  type: IRType,
  path: string,
  typeNames: Set<string>,
  errors: IRValidationError[]
): void {
  if (!type.name) {
    errors.push({ path: `${path}.name`, message: 'Type name is required' });
  }

  if (!type.kind) {
    errors.push({ path: `${path}.kind`, message: 'Type kind is required' });
  }

  // Validate based on kind
  switch (type.kind) {
    case 'object':
      if (type.properties) {
        for (let i = 0; i < type.properties.length; i++) {
          const prop = type.properties[i]!;
          validateTypeRef(prop.type, `${path}.properties[${i}].type`, typeNames, errors);
        }
      }
      if (type.additionalProperties && typeof type.additionalProperties !== 'boolean') {
        validateTypeRef(
          type.additionalProperties,
          `${path}.additionalProperties`,
          typeNames,
          errors
        );
      }
      break;

    case 'array':
      if (!type.items) {
        errors.push({
          path: `${path}.items`,
          message: 'Array type must have items',
        });
      } else {
        validateTypeRef(type.items, `${path}.items`, typeNames, errors);
      }
      break;

    case 'union':
      if (!type.variants || type.variants.length === 0) {
        errors.push({
          path: `${path}.variants`,
          message: 'Union type must have variants',
        });
      } else {
        for (let i = 0; i < type.variants.length; i++) {
          validateTypeRef(type.variants[i]!, `${path}.variants[${i}]`, typeNames, errors);
        }
      }
      break;

    case 'intersection':
      if (!type.members || type.members.length === 0) {
        errors.push({
          path: `${path}.members`,
          message: 'Intersection type must have members',
        });
      } else {
        for (let i = 0; i < type.members.length; i++) {
          validateTypeRef(type.members[i]!, `${path}.members[${i}]`, typeNames, errors);
        }
      }
      break;

    case 'enum':
      if (!type.enumValues || type.enumValues.length === 0) {
        errors.push({
          path: `${path}.enumValues`,
          message: 'Enum type must have values',
        });
      }
      break;
  }
}

function validateTypeRef(
  ref: IRTypeRef,
  path: string,
  typeNames: Set<string>,
  errors: IRValidationError[]
): void {
  if (!ref.kind) {
    errors.push({ path: `${path}.kind`, message: 'Type reference kind is required' });
    return;
  }

  switch (ref.kind) {
    case 'reference':
      if (!ref.name) {
        errors.push({
          path: `${path}.name`,
          message: 'Reference type must have a name',
        });
      } else if (!typeNames.has(ref.name)) {
        errors.push({
          path: `${path}.name`,
          message: `Referenced type "${ref.name}" not found`,
        });
      }
      break;

    case 'inline':
      if (!ref.inlineType) {
        errors.push({
          path: `${path}.inlineType`,
          message: 'Inline type reference must have inlineType',
        });
      } else {
        validateType(ref.inlineType, `${path}.inlineType`, typeNames, errors);
      }
      break;

    case 'primitive':
      if (!ref.primitiveKind) {
        errors.push({
          path: `${path}.primitiveKind`,
          message: 'Primitive type reference must have primitiveKind',
        });
      }
      break;
  }
}

function validateEndpoint(
  endpoint: IREndpoint,
  path: string,
  typeNames: Set<string>,
  errors: IRValidationError[]
): void {
  if (!endpoint.operationId) {
    errors.push({
      path: `${path}.operationId`,
      message: 'Endpoint operationId is required',
    });
  }

  if (!endpoint.method) {
    errors.push({ path: `${path}.method`, message: 'Endpoint method is required' });
  }

  if (!endpoint.path) {
    errors.push({ path: `${path}.path`, message: 'Endpoint path is required' });
  }

  // Validate parameters
  for (let i = 0; i < endpoint.parameters.length; i++) {
    const param = endpoint.parameters[i]!;
    validateTypeRef(param.type, `${path}.parameters[${i}].type`, typeNames, errors);
  }

  // Validate request body
  if (endpoint.requestBody) {
    for (let i = 0; i < endpoint.requestBody.content.length; i++) {
      const content = endpoint.requestBody.content[i]!;
      validateTypeRef(
        content.schema,
        `${path}.requestBody.content[${i}].schema`,
        typeNames,
        errors
      );
    }
  }

  // Validate responses
  for (let i = 0; i < endpoint.responses.length; i++) {
    const response = endpoint.responses[i]!;
    if (response.content) {
      for (let j = 0; j < response.content.length; j++) {
        const content = response.content[j]!;
        validateTypeRef(
          content.schema,
          `${path}.responses[${i}].content[${j}].schema`,
          typeNames,
          errors
        );
      }
    }
  }
}

function validateOperation(
  operation: IROperation,
  path: string,
  typeNames: Set<string>,
  errors: IRValidationError[]
): void {
  if (!operation.name) {
    errors.push({ path: `${path}.name`, message: 'Operation name is required' });
  }

  if (!operation.kind) {
    errors.push({ path: `${path}.kind`, message: 'Operation kind is required' });
  }

  // Validate variables
  for (let i = 0; i < operation.variables.length; i++) {
    const variable = operation.variables[i]!;
    validateTypeRef(variable.type, `${path}.variables[${i}].type`, typeNames, errors);
  }

  // Validate return type
  validateTypeRef(operation.returnType, `${path}.returnType`, typeNames, errors);
}
