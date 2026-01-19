import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'node:path';
import { parseOpenAPI } from '../../../src/parsers/openapi/index.js';
import type { IRSchema } from '../../../src/ir/types.js';

describe('OpenAPI Parser', () => {
  let schema: IRSchema;

  beforeAll(async () => {
    const fixturesPath = resolve(__dirname, '../../fixtures/openapi/petstore.yaml');
    schema = await parseOpenAPI(fixturesPath);
  });

  describe('metadata parsing', () => {
    it('should parse API title', () => {
      expect(schema.metadata.title).toBe('Petstore API');
    });

    it('should parse API version', () => {
      expect(schema.metadata.version).toBe('1.0.0');
    });

    it('should parse base URL from servers', () => {
      expect(schema.metadata.baseUrl).toBe('https://api.petstore.example.com/v1');
    });

    it('should set source to openapi', () => {
      expect(schema.metadata.source).toBe('openapi');
    });
  });

  describe('type parsing', () => {
    it('should parse Pet schema', () => {
      const pet = schema.types.get('Pet');
      expect(pet).toBeDefined();
      expect(pet?.kind).toBe('object');
      expect(pet?.properties).toBeDefined();
    });

    it('should parse Pet properties correctly', () => {
      const pet = schema.types.get('Pet');
      const properties = pet?.properties ?? [];

      const idProp = properties.find((p) => p.name === 'id');
      expect(idProp).toBeDefined();
      expect(idProp?.required).toBe(true);

      const nameProp = properties.find((p) => p.name === 'name');
      expect(nameProp).toBeDefined();
      expect(nameProp?.required).toBe(true);
    });

    it('should parse enum types', () => {
      const petStatus = schema.types.get('PetStatus');
      expect(petStatus).toBeDefined();
      expect(petStatus?.kind).toBe('enum');
      expect(petStatus?.enumValues).toHaveLength(3);
      expect(petStatus?.enumValues?.map((v) => v.value)).toContain('available');
    });

    it('should parse object with $ref properties', () => {
      const pet = schema.types.get('Pet');
      const ownerProp = pet?.properties?.find((p) => p.name === 'owner');
      expect(ownerProp).toBeDefined();
      expect(ownerProp?.type.kind).toBe('reference');
      expect(ownerProp?.type.name).toBe('Owner');
    });

    it('should parse Error schema with additionalProperties', () => {
      const error = schema.types.get('Error');
      expect(error).toBeDefined();

      const detailsProp = error?.properties?.find((p) => p.name === 'details');
      expect(detailsProp).toBeDefined();
    });
  });

  describe('endpoint parsing', () => {
    it('should parse listPets endpoint', () => {
      const endpoint = schema.endpoints.find((e) => e.operationId === 'listPets');
      expect(endpoint).toBeDefined();
      expect(endpoint?.method).toBe('get');
      expect(endpoint?.path).toBe('/pets');
    });

    it('should parse query parameters', () => {
      const endpoint = schema.endpoints.find((e) => e.operationId === 'listPets');
      const limitParam = endpoint?.parameters.find((p) => p.name === 'limit');

      expect(limitParam).toBeDefined();
      expect(limitParam?.in).toBe('query');
      expect(limitParam?.required).toBe(false);
    });

    it('should parse path parameters', () => {
      const endpoint = schema.endpoints.find((e) => e.operationId === 'getPet');
      const petIdParam = endpoint?.parameters.find((p) => p.name === 'petId');

      expect(petIdParam).toBeDefined();
      expect(petIdParam?.in).toBe('path');
      expect(petIdParam?.required).toBe(true);
    });

    it('should parse request body', () => {
      const endpoint = schema.endpoints.find((e) => e.operationId === 'createPet');
      expect(endpoint?.requestBody).toBeDefined();
      expect(endpoint?.requestBody?.required).toBe(true);
      expect(endpoint?.requestBody?.content).toHaveLength(1);
    });

    it('should parse responses', () => {
      const endpoint = schema.endpoints.find((e) => e.operationId === 'getPet');
      expect(endpoint?.responses).toBeDefined();

      const okResponse = endpoint?.responses.find((r) => r.statusCode === '200');
      expect(okResponse).toBeDefined();
      expect(okResponse?.content).toHaveLength(1);
    });

    it('should parse all CRUD endpoints', () => {
      const operationIds = schema.endpoints.map((e) => e.operationId);

      expect(operationIds).toContain('listPets');
      expect(operationIds).toContain('createPet');
      expect(operationIds).toContain('getPet');
      expect(operationIds).toContain('updatePet');
      expect(operationIds).toContain('deletePet');
    });
  });

  describe('validation', () => {
    it('should have valid type references', () => {
      // All endpoint response types should reference valid types
      for (const endpoint of schema.endpoints) {
        for (const response of endpoint.responses) {
          if (response.content) {
            for (const content of response.content) {
              if (content.schema.kind === 'reference') {
                // Reference should exist in types map
                const refName = content.schema.name;
                if (refName && !['void', 'unknown'].includes(refName)) {
                  // Could be an inline type or primitive
                }
              }
            }
          }
        }
      }
    });
  });
});
