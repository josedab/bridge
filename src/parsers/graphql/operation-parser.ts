/**
 * GraphQL operation parser - extracts operations from GraphQL documents
 */

import {
  parse,
  type DocumentNode,
  type OperationDefinitionNode,
  type VariableDefinitionNode,
  type TypeNode,
  type ValueNode,
  Kind,
} from 'graphql';
import type { IROperation, IRVariable, IRTypeRef } from '../../ir/types.js';
import { createPrimitiveRef, createTypeRef } from '../../ir/types.js';
import { BUILTIN_SCALARS, DEFAULT_SCALAR_MAPPINGS } from './types.js';

/**
 * Parse GraphQL operations from a document string
 */
export function parseOperations(
  documentSource: string,
  scalarMappings: Record<string, string> = {}
): IROperation[] {
  const document = parse(documentSource);
  return extractOperations(document, scalarMappings);
}

/**
 * Extract operations from a parsed document
 */
export function extractOperations(
  document: DocumentNode,
  scalarMappings: Record<string, string> = {}
): IROperation[] {
  const operations: IROperation[] = [];
  const allMappings = { ...DEFAULT_SCALAR_MAPPINGS, ...scalarMappings };

  for (const definition of document.definitions) {
    if (definition.kind === Kind.OPERATION_DEFINITION) {
      const operation = convertOperation(
        definition,
        allMappings,
        documentSource(document, definition)
      );
      if (operation) {
        operations.push(operation);
      }
    }
  }

  return operations;
}

/**
 * Convert an operation definition to IR
 */
function convertOperation(
  op: OperationDefinitionNode,
  scalarMappings: Record<string, string>,
  document: string
): IROperation | null {
  // Skip anonymous operations
  if (!op.name) {
    return null;
  }

  const variables = op.variableDefinitions?.map((v) => convertVariable(v, scalarMappings)) ?? [];

  // Get return type from selection set (simplified - assumes root type)
  const returnType = createPrimitiveRef('unknown');

  return {
    name: op.name.value,
    kind: op.operation,
    variables,
    returnType,
    document,
  };
}

/**
 * Convert a variable definition to IR
 */
function convertVariable(
  variable: VariableDefinitionNode,
  scalarMappings: Record<string, string>
): IRVariable {
  return {
    name: variable.variable.name.value,
    type: convertTypeNode(variable.type, scalarMappings),
    default: variable.defaultValue ? extractDefaultValue(variable.defaultValue) : undefined,
  };
}

/**
 * Convert a GraphQL type node to IR type reference
 */
function convertTypeNode(typeNode: TypeNode, scalarMappings: Record<string, string>): IRTypeRef {
  switch (typeNode.kind) {
    case Kind.NON_NULL_TYPE:
      // Non-null types are not nullable
      const innerRef = convertTypeNode(typeNode.type, scalarMappings);
      return { ...innerRef, nullable: false };

    case Kind.LIST_TYPE:
      // List types become arrays
      const itemRef = convertTypeNode(typeNode.type, scalarMappings);
      return {
        kind: 'inline',
        inlineType: {
          name: 'List',
          kind: 'array',
          items: itemRef,
        },
        nullable: true,
      };

    case Kind.NAMED_TYPE:
      const typeName = typeNode.name.value;

      // Check if it's a built-in scalar
      if (BUILTIN_SCALARS[typeName]) {
        return createPrimitiveRef(
          typeName === 'Int' || typeName === 'Float'
            ? 'number'
            : typeName === 'Boolean'
              ? 'boolean'
              : 'string',
          true
        );
      }

      // Check if it's a custom scalar with mapping
      if (scalarMappings[typeName]) {
        return createPrimitiveRef('string', true);
      }

      // Reference to a named type
      return createTypeRef(typeName, true);
  }
}

/**
 * Extract default value from AST
 */
function extractDefaultValue(node: ValueNode): unknown {
  switch (node.kind) {
    case Kind.INT:
      return parseInt(node.value, 10);
    case Kind.FLOAT:
      return parseFloat(node.value);
    case Kind.STRING:
      return node.value;
    case Kind.BOOLEAN:
      return node.value;
    case Kind.NULL:
      return null;
    case Kind.ENUM:
      return node.value;
    case Kind.LIST:
      return node.values.map(extractDefaultValue);
    case Kind.OBJECT:
      const obj: Record<string, unknown> = {};
      for (const field of node.fields) {
        obj[field.name.value] = extractDefaultValue(field.value);
      }
      return obj;
    default:
      return undefined;
  }
}

/**
 * Get the source text for an operation
 */
function documentSource(_document: DocumentNode, op: OperationDefinitionNode): string {
  // This is simplified - in a full implementation we'd track source locations
  const opType = op.operation;
  const opName = op.name?.value ?? 'Anonymous';
  const variables = op.variableDefinitions
    ?.map((v) => `$${v.variable.name.value}: ${printType(v.type)}`)
    .join(', ');

  const varStr = variables ? `(${variables})` : '';
  return `${opType} ${opName}${varStr} { ... }`;
}

/**
 * Print a type node to string
 */
function printType(typeNode: TypeNode): string {
  switch (typeNode.kind) {
    case Kind.NON_NULL_TYPE:
      return `${printType(typeNode.type)}!`;
    case Kind.LIST_TYPE:
      return `[${printType(typeNode.type)}]`;
    case Kind.NAMED_TYPE:
      return typeNode.name.value;
  }
}
