/**
 * Tests for IR Schema validator
 */

import { describe, it, expect } from 'vitest';
import { validateIRSchema } from '../../../src/ir/validator.js';
import type { IRSchema, IRType, IRTypeRef, IREndpoint, IROperation } from '../../../src/ir/types.js';

// Helper to create a minimal valid schema
function createValidSchema(): IRSchema {
  return {
    metadata: {
      title: 'Test API',
      version: '1.0.0',
      source: 'openapi',
    },
    types: new Map(),
    endpoints: [],
    operations: [],
  };
}

// Helper to create a primitive type reference
function primitiveRef(kind: string): IRTypeRef {
  return { kind: 'primitive', primitiveKind: kind } as IRTypeRef;
}

// Helper to create a reference type reference
function refType(name: string): IRTypeRef {
  return { kind: 'reference', name } as IRTypeRef;
}

describe('validateIRSchema', () => {
  describe('metadata validation', () => {
    it('should pass for valid schema', () => {
      const schema = createValidSchema();
      const result = validateIRSchema(schema);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when title is missing', () => {
      const schema = createValidSchema();
      schema.metadata.title = '';
      const result = validateIRSchema(schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: 'metadata.title',
        message: 'Title is required',
      });
    });

    it('should fail when version is missing', () => {
      const schema = createValidSchema();
      schema.metadata.version = '';
      const result = validateIRSchema(schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: 'metadata.version',
        message: 'Version is required',
      });
    });

    it('should fail when source is invalid', () => {
      const schema = createValidSchema();
      schema.metadata.source = 'invalid' as 'openapi';
      const result = validateIRSchema(schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: 'metadata.source',
        message: 'Source must be "openapi" or "graphql"',
      });
    });

    it('should accept graphql as source', () => {
      const schema = createValidSchema();
      schema.metadata.source = 'graphql';
      const result = validateIRSchema(schema);
      expect(result.valid).toBe(true);
    });
  });

  describe('type validation', () => {
    it('should fail when type name is missing', () => {
      const schema = createValidSchema();
      const type: IRType = {
        name: '',
        kind: 'object',
        properties: [],
      };
      schema.types.set('TestType', type);

      const result = validateIRSchema(schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: 'types.TestType.name',
        message: 'Type name is required',
      });
    });

    it('should fail when type kind is missing', () => {
      const schema = createValidSchema();
      const type = {
        name: 'TestType',
        kind: '',
      } as IRType;
      schema.types.set('TestType', type);

      const result = validateIRSchema(schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: 'types.TestType.kind',
        message: 'Type kind is required',
      });
    });

    it('should validate object type properties', () => {
      const schema = createValidSchema();
      const type: IRType = {
        name: 'TestType',
        kind: 'object',
        properties: [
          { name: 'id', type: primitiveRef('string'), required: true },
        ],
      };
      schema.types.set('TestType', type);

      const result = validateIRSchema(schema);
      expect(result.valid).toBe(true);
    });

    it('should fail when object property references unknown type', () => {
      const schema = createValidSchema();
      const type: IRType = {
        name: 'TestType',
        kind: 'object',
        properties: [
          { name: 'ref', type: refType('UnknownType'), required: true },
        ],
      };
      schema.types.set('TestType', type);

      const result = validateIRSchema(schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: 'types.TestType.properties[0].type.name',
        message: 'Referenced type "UnknownType" not found',
      });
    });

    it('should validate object additionalProperties', () => {
      const schema = createValidSchema();
      const type: IRType = {
        name: 'TestType',
        kind: 'object',
        properties: [],
        additionalProperties: primitiveRef('string'),
      };
      schema.types.set('TestType', type);

      const result = validateIRSchema(schema);
      expect(result.valid).toBe(true);
    });

    it('should fail when array type has no items', () => {
      const schema = createValidSchema();
      const type: IRType = {
        name: 'TestArray',
        kind: 'array',
      };
      schema.types.set('TestArray', type);

      const result = validateIRSchema(schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: 'types.TestArray.items',
        message: 'Array type must have items',
      });
    });

    it('should validate array type with items', () => {
      const schema = createValidSchema();
      const type: IRType = {
        name: 'TestArray',
        kind: 'array',
        items: primitiveRef('string'),
      };
      schema.types.set('TestArray', type);

      const result = validateIRSchema(schema);
      expect(result.valid).toBe(true);
    });

    it('should fail when union type has no variants', () => {
      const schema = createValidSchema();
      const type: IRType = {
        name: 'TestUnion',
        kind: 'union',
        variants: [],
      };
      schema.types.set('TestUnion', type);

      const result = validateIRSchema(schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: 'types.TestUnion.variants',
        message: 'Union type must have variants',
      });
    });

    it('should validate union type with variants', () => {
      const schema = createValidSchema();
      const type: IRType = {
        name: 'TestUnion',
        kind: 'union',
        variants: [primitiveRef('string'), primitiveRef('number')],
      };
      schema.types.set('TestUnion', type);

      const result = validateIRSchema(schema);
      expect(result.valid).toBe(true);
    });

    it('should fail when intersection type has no members', () => {
      const schema = createValidSchema();
      const type: IRType = {
        name: 'TestIntersection',
        kind: 'intersection',
        members: [],
      };
      schema.types.set('TestIntersection', type);

      const result = validateIRSchema(schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: 'types.TestIntersection.members',
        message: 'Intersection type must have members',
      });
    });

    it('should fail when enum type has no values', () => {
      const schema = createValidSchema();
      const type: IRType = {
        name: 'TestEnum',
        kind: 'enum',
        enumValues: [],
      };
      schema.types.set('TestEnum', type);

      const result = validateIRSchema(schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: 'types.TestEnum.enumValues',
        message: 'Enum type must have values',
      });
    });

    it('should validate enum type with values', () => {
      const schema = createValidSchema();
      const type: IRType = {
        name: 'TestEnum',
        kind: 'enum',
        enumValues: [
          { name: 'A', value: 'a' },
          { name: 'B', value: 'b' },
        ],
      };
      schema.types.set('TestEnum', type);

      const result = validateIRSchema(schema);
      expect(result.valid).toBe(true);
    });
  });

  describe('type reference validation', () => {
    it('should fail when type reference kind is missing', () => {
      const schema = createValidSchema();
      const type: IRType = {
        name: 'TestType',
        kind: 'object',
        properties: [
          { name: 'field', type: { kind: '' } as IRTypeRef, required: true },
        ],
      };
      schema.types.set('TestType', type);

      const result = validateIRSchema(schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: 'types.TestType.properties[0].type.kind',
        message: 'Type reference kind is required',
      });
    });

    it('should fail when reference type has no name', () => {
      const schema = createValidSchema();
      const type: IRType = {
        name: 'TestType',
        kind: 'object',
        properties: [
          { name: 'field', type: { kind: 'reference', name: '' } as IRTypeRef, required: true },
        ],
      };
      schema.types.set('TestType', type);

      const result = validateIRSchema(schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: 'types.TestType.properties[0].type.name',
        message: 'Reference type must have a name',
      });
    });

    it('should pass when reference type points to existing type', () => {
      const schema = createValidSchema();
      const petType: IRType = {
        name: 'Pet',
        kind: 'object',
        properties: [{ name: 'name', type: primitiveRef('string'), required: true }],
      };
      const ownerType: IRType = {
        name: 'Owner',
        kind: 'object',
        properties: [{ name: 'pet', type: refType('Pet'), required: true }],
      };
      schema.types.set('Pet', petType);
      schema.types.set('Owner', ownerType);

      const result = validateIRSchema(schema);
      expect(result.valid).toBe(true);
    });

    it('should fail when inline type reference has no inlineType', () => {
      const schema = createValidSchema();
      const type: IRType = {
        name: 'TestType',
        kind: 'object',
        properties: [
          { name: 'field', type: { kind: 'inline' } as IRTypeRef, required: true },
        ],
      };
      schema.types.set('TestType', type);

      const result = validateIRSchema(schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: 'types.TestType.properties[0].type.inlineType',
        message: 'Inline type reference must have inlineType',
      });
    });

    it('should validate inline type reference with inlineType', () => {
      const schema = createValidSchema();
      const type: IRType = {
        name: 'TestType',
        kind: 'object',
        properties: [
          {
            name: 'field',
            type: {
              kind: 'inline',
              inlineType: { name: 'InlineObj', kind: 'object', properties: [] },
            } as IRTypeRef,
            required: true,
          },
        ],
      };
      schema.types.set('TestType', type);

      const result = validateIRSchema(schema);
      expect(result.valid).toBe(true);
    });

    it('should fail when primitive type reference has no primitiveKind', () => {
      const schema = createValidSchema();
      const type: IRType = {
        name: 'TestType',
        kind: 'object',
        properties: [
          { name: 'field', type: { kind: 'primitive' } as IRTypeRef, required: true },
        ],
      };
      schema.types.set('TestType', type);

      const result = validateIRSchema(schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: 'types.TestType.properties[0].type.primitiveKind',
        message: 'Primitive type reference must have primitiveKind',
      });
    });
  });

  describe('endpoint validation', () => {
    it('should fail when endpoint operationId is missing', () => {
      const schema = createValidSchema();
      const endpoint: IREndpoint = {
        operationId: '',
        method: 'get',
        path: '/test',
        parameters: [],
        responses: [],
      };
      schema.endpoints.push(endpoint);

      const result = validateIRSchema(schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: 'endpoints[0].operationId',
        message: 'Endpoint operationId is required',
      });
    });

    it('should fail when endpoint method is missing', () => {
      const schema = createValidSchema();
      const endpoint: IREndpoint = {
        operationId: 'getTest',
        method: '' as 'get',
        path: '/test',
        parameters: [],
        responses: [],
      };
      schema.endpoints.push(endpoint);

      const result = validateIRSchema(schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: 'endpoints[0].method',
        message: 'Endpoint method is required',
      });
    });

    it('should fail when endpoint path is missing', () => {
      const schema = createValidSchema();
      const endpoint: IREndpoint = {
        operationId: 'getTest',
        method: 'get',
        path: '',
        parameters: [],
        responses: [],
      };
      schema.endpoints.push(endpoint);

      const result = validateIRSchema(schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: 'endpoints[0].path',
        message: 'Endpoint path is required',
      });
    });

    it('should validate endpoint parameters', () => {
      const schema = createValidSchema();
      const endpoint: IREndpoint = {
        operationId: 'getTest',
        method: 'get',
        path: '/test/{id}',
        parameters: [
          { name: 'id', in: 'path', type: primitiveRef('string'), required: true },
        ],
        responses: [],
      };
      schema.endpoints.push(endpoint);

      const result = validateIRSchema(schema);
      expect(result.valid).toBe(true);
    });

    it('should validate endpoint requestBody', () => {
      const schema = createValidSchema();
      const endpoint: IREndpoint = {
        operationId: 'createTest',
        method: 'post',
        path: '/test',
        parameters: [],
        requestBody: {
          required: true,
          content: [
            { mediaType: 'application/json', schema: primitiveRef('object') },
          ],
        },
        responses: [],
      };
      schema.endpoints.push(endpoint);

      const result = validateIRSchema(schema);
      expect(result.valid).toBe(true);
    });

    it('should validate endpoint responses', () => {
      const schema = createValidSchema();
      const endpoint: IREndpoint = {
        operationId: 'getTest',
        method: 'get',
        path: '/test',
        parameters: [],
        responses: [
          {
            statusCode: '200',
            description: 'Success',
            content: [
              { mediaType: 'application/json', schema: primitiveRef('object') },
            ],
          },
        ],
      };
      schema.endpoints.push(endpoint);

      const result = validateIRSchema(schema);
      expect(result.valid).toBe(true);
    });

    it('should validate endpoint with response without content', () => {
      const schema = createValidSchema();
      const endpoint: IREndpoint = {
        operationId: 'deleteTest',
        method: 'delete',
        path: '/test/{id}',
        parameters: [
          { name: 'id', in: 'path', type: primitiveRef('string'), required: true },
        ],
        responses: [
          { statusCode: '204', description: 'No Content' },
        ],
      };
      schema.endpoints.push(endpoint);

      const result = validateIRSchema(schema);
      expect(result.valid).toBe(true);
    });
  });

  describe('operation validation', () => {
    it('should fail when operation name is missing', () => {
      const schema = createValidSchema();
      schema.metadata.source = 'graphql';
      const operation: IROperation = {
        name: '',
        kind: 'query',
        variables: [],
        returnType: primitiveRef('string'),
        source: '',
      };
      schema.operations.push(operation);

      const result = validateIRSchema(schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: 'operations[0].name',
        message: 'Operation name is required',
      });
    });

    it('should fail when operation kind is missing', () => {
      const schema = createValidSchema();
      schema.metadata.source = 'graphql';
      const operation: IROperation = {
        name: 'getUser',
        kind: '' as 'query',
        variables: [],
        returnType: primitiveRef('object'),
        source: '',
      };
      schema.operations.push(operation);

      const result = validateIRSchema(schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: 'operations[0].kind',
        message: 'Operation kind is required',
      });
    });

    it('should validate operation variables', () => {
      const schema = createValidSchema();
      schema.metadata.source = 'graphql';
      const operation: IROperation = {
        name: 'getUser',
        kind: 'query',
        variables: [
          { name: 'id', type: primitiveRef('string'), required: true },
        ],
        returnType: primitiveRef('object'),
        source: 'query getUser($id: ID!) { user(id: $id) { id } }',
      };
      schema.operations.push(operation);

      const result = validateIRSchema(schema);
      expect(result.valid).toBe(true);
    });

    it('should validate operation returnType', () => {
      const schema = createValidSchema();
      schema.metadata.source = 'graphql';

      const userType: IRType = {
        name: 'User',
        kind: 'object',
        properties: [{ name: 'id', type: primitiveRef('string'), required: true }],
      };
      schema.types.set('User', userType);

      const operation: IROperation = {
        name: 'getUser',
        kind: 'query',
        variables: [],
        returnType: refType('User'),
        source: 'query getUser { user { id } }',
      };
      schema.operations.push(operation);

      const result = validateIRSchema(schema);
      expect(result.valid).toBe(true);
    });
  });

  describe('multiple errors', () => {
    it('should collect all validation errors', () => {
      const schema = createValidSchema();
      schema.metadata.title = '';
      schema.metadata.version = '';
      schema.metadata.source = 'invalid' as 'openapi';

      const result = validateIRSchema(schema);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });
});
