import { describe, it, expect, beforeAll } from 'vitest';
import { parseGraphQLSchema } from '../../../src/parsers/graphql/parser.js';
import type { IRSchema } from '../../../src/ir/types.js';

describe('GraphQL Parser', () => {
  describe('parseGraphQLSchema', () => {
    it('should parse a simple schema', () => {
      const schemaSource = `
        type User {
          id: ID!
          name: String!
        }

        type Query {
          user(id: ID!): User
        }
      `;

      const schema = parseGraphQLSchema(schemaSource);

      expect(schema).toBeDefined();
      expect(schema.metadata.source).toBe('graphql');
    });

    it('should parse metadata', () => {
      const schemaSource = `
        type Query {
          version: String
        }
      `;

      const schema = parseGraphQLSchema(schemaSource);

      expect(schema.metadata.title).toBe('GraphQL API');
      expect(schema.metadata.version).toBe('1.0.0');
    });
  });

  describe('type parsing', () => {
    let schema: IRSchema;

    beforeAll(() => {
      const schemaSource = `
        type Human {
          id: ID!
          name: String!
          height: Float
        }

        enum Episode {
          NEWHOPE
          EMPIRE
          JEDI
        }

        union SearchResult = Human

        input ReviewInput {
          stars: Int!
          commentary: String
        }

        interface Character {
          id: ID!
          name: String!
        }

        type Query {
          human(id: ID!): Human
        }
      `;
      schema = parseGraphQLSchema(schemaSource);
    });

    it('should parse object types', () => {
      const humanType = schema.types.get('Human');
      expect(humanType).toBeDefined();
      expect(humanType?.kind).toBe('object');
    });

    it('should parse type properties', () => {
      const humanType = schema.types.get('Human');
      expect(humanType?.kind).toBe('object');
      if (humanType?.kind === 'object') {
        expect(humanType.properties).toBeDefined();
        expect(humanType.properties.length).toBeGreaterThan(0);

        const idProp = humanType.properties.find((p) => p.name === 'id');
        expect(idProp).toBeDefined();
        expect(idProp?.required).toBe(true);
      }
    });

    it('should parse enum types', () => {
      const episodeType = schema.types.get('Episode');
      expect(episodeType).toBeDefined();
      expect(episodeType?.kind).toBe('enum');
      if (episodeType?.kind === 'enum') {
        expect(episodeType.enumValues).toBeDefined();
        expect(episodeType.enumValues?.length).toBe(3);
        expect(episodeType.enumValues?.map((v) => v.name)).toContain('NEWHOPE');
        expect(episodeType.enumValues?.map((v) => v.name)).toContain('EMPIRE');
        expect(episodeType.enumValues?.map((v) => v.name)).toContain('JEDI');
      }
    });

    it('should parse union types', () => {
      const searchResultType = schema.types.get('SearchResult');
      expect(searchResultType).toBeDefined();
      expect(searchResultType?.kind).toBe('union');
      if (searchResultType?.kind === 'union') {
        expect(searchResultType.variants).toBeDefined();
        expect(searchResultType.variants?.length).toBe(1);
      }
    });

    it('should parse input types', () => {
      const reviewInputType = schema.types.get('ReviewInput');
      expect(reviewInputType).toBeDefined();
      expect(reviewInputType?.kind).toBe('object');
      if (reviewInputType?.kind === 'object') {
        const starsProp = reviewInputType.properties.find((p) => p.name === 'stars');
        expect(starsProp).toBeDefined();
        expect(starsProp?.required).toBe(true);
      }
    });

    it('should parse interface types as objects', () => {
      const characterType = schema.types.get('Character');
      expect(characterType).toBeDefined();
      expect(characterType?.kind).toBe('object');
    });

    it('should preserve type descriptions from block strings', () => {
      const schemaWithDescriptions = `
        """A human character"""
        type Person {
          id: ID!
        }
        type Query { person: Person }
      `;
      const descSchema = parseGraphQLSchema(schemaWithDescriptions);
      const personType = descSchema.types.get('Person');
      expect(personType?.description).toBe('A human character');
    });

    it('should preserve field descriptions from block strings', () => {
      const schemaWithDescriptions = `
        type Person {
          id: ID!
          """Height in meters"""
          height: Float
        }
        type Query { person: Person }
      `;
      const descSchema = parseGraphQLSchema(schemaWithDescriptions);
      const personType = descSchema.types.get('Person');
      if (personType?.kind === 'object') {
        const heightProp = personType.properties.find((p) => p.name === 'height');
        expect(heightProp?.description).toBe('Height in meters');
      }
    });
  });

  describe('scalar mappings', () => {
    it('should map ID to primitive string', () => {
      const schemaSource = `
        type User {
          id: ID!
          name: String!
        }
        type Query { user: User }
      `;

      const schema = parseGraphQLSchema(schemaSource);
      const userType = schema.types.get('User');

      if (userType?.kind === 'object') {
        const idProp = userType.properties.find((p) => p.name === 'id');
        expect(idProp?.type.kind).toBe('primitive');
      }
    });

    it('should map Int to primitive number', () => {
      const schemaSource = `
        type Item {
          count: Int!
        }
        type Query { item: Item }
      `;

      const schema = parseGraphQLSchema(schemaSource);
      const itemType = schema.types.get('Item');

      if (itemType?.kind === 'object') {
        const countProp = itemType.properties.find((p) => p.name === 'count');
        expect(countProp?.type.kind).toBe('primitive');
      }
    });

    it('should map Float to primitive number', () => {
      const schemaSource = `
        type Measurement {
          value: Float!
        }
        type Query { measurement: Measurement }
      `;

      const schema = parseGraphQLSchema(schemaSource);
      const measurementType = schema.types.get('Measurement');

      if (measurementType?.kind === 'object') {
        const valueProp = measurementType.properties.find((p) => p.name === 'value');
        expect(valueProp?.type.kind).toBe('primitive');
      }
    });

    it('should map Boolean to primitive boolean', () => {
      const schemaSource = `
        type Status {
          active: Boolean!
        }
        type Query { status: Status }
      `;

      const schema = parseGraphQLSchema(schemaSource);
      const statusType = schema.types.get('Status');

      if (statusType?.kind === 'object') {
        const activeProp = statusType.properties.find((p) => p.name === 'active');
        expect(activeProp?.type.kind).toBe('primitive');
      }
    });

    it('should use custom scalar mappings', () => {
      const schemaSource = `
        scalar DateTime

        type Event {
          timestamp: DateTime!
        }
        type Query { event: Event }
      `;

      const schema = parseGraphQLSchema(schemaSource, {
        scalarMappings: {
          DateTime: 'string',
        },
      });

      const eventType = schema.types.get('Event');
      if (eventType?.kind === 'object') {
        const timestampProp = eventType.properties.find((p) => p.name === 'timestamp');
        expect(timestampProp?.type.kind).toBe('primitive');
      }
    });
  });

  describe('nullability', () => {
    it('should mark non-null fields as required', () => {
      const schemaSource = `
        type User {
          id: ID!
          name: String!
          email: String
        }
      `;

      const schema = parseGraphQLSchema(schemaSource);
      const userType = schema.types.get('User');

      if (userType?.kind === 'object') {
        const idProp = userType.properties.find((p) => p.name === 'id');
        const nameProp = userType.properties.find((p) => p.name === 'name');
        const emailProp = userType.properties.find((p) => p.name === 'email');

        expect(idProp?.required).toBe(true);
        expect(nameProp?.required).toBe(true);
        expect(emailProp?.required).toBe(false);
      }
    });
  });

  describe('list types', () => {
    it('should handle list types', () => {
      const schemaSource = `
        type Blog {
          tags: [String]
        }
        type Query { blog: Blog }
      `;

      const schema = parseGraphQLSchema(schemaSource);
      const blogType = schema.types.get('Blog');

      if (blogType?.kind === 'object') {
        const tagsProp = blogType.properties.find((p) => p.name === 'tags');
        // Lists are represented as inline types with array kind
        expect(tagsProp?.type.kind).toBe('inline');
      }
    });

    it('should handle non-null list with non-null items', () => {
      const schemaSource = `
        type Blog {
          tags: [String!]!
        }
        type Query { blog: Blog }
      `;

      const schema = parseGraphQLSchema(schemaSource);
      const blogType = schema.types.get('Blog');

      if (blogType?.kind === 'object') {
        const tagsProp = blogType.properties.find((p) => p.name === 'tags');
        expect(tagsProp?.required).toBe(true);
        // Lists are represented as inline types
        expect(tagsProp?.type.kind).toBe('inline');
      }
    });
  });

  describe('error handling', () => {
    it('should throw ParseError for invalid schema', () => {
      const invalidSchema = `
        type InvalidType {
          field: NonExistentType
        }
      `;

      expect(() => parseGraphQLSchema(invalidSchema)).toThrow();
    });

    it('should throw ParseError for syntax errors', () => {
      const syntaxError = `
        type Broken {
          field String
        }
      `;

      expect(() => parseGraphQLSchema(syntaxError)).toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty schema with only Query', () => {
      const schemaSource = `
        type Query {
          version: String
        }
      `;

      const schema = parseGraphQLSchema(schemaSource);
      expect(schema.types.get('Query')).toBeDefined();
    });

    it('should skip built-in types', () => {
      const schemaSource = `
        type User {
          id: ID!
          name: String!
        }
        type Query { user: User }
      `;

      const schema = parseGraphQLSchema(schemaSource);

      expect(schema.types.has('__Schema')).toBe(false);
      expect(schema.types.has('__Type')).toBe(false);
      expect(schema.types.has('__Field')).toBe(false);
      expect(schema.types.has('String')).toBe(false);
      expect(schema.types.has('Int')).toBe(false);
    });

    it('should handle nested lists', () => {
      const schemaSource = `
        type Matrix {
          data: [[Int]]
        }
        type Query { matrix: Matrix }
      `;

      const schema = parseGraphQLSchema(schemaSource);
      const matrixType = schema.types.get('Matrix');

      if (matrixType?.kind === 'object') {
        const dataProp = matrixType.properties.find((p) => p.name === 'data');
        // Lists are represented as inline types
        expect(dataProp?.type.kind).toBe('inline');
      }
    });
  });
});
