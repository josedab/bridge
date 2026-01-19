# CLAUDE.md - Bridge Project Guide

## Project Overview

Bridge is a TypeScript code generator that produces type-safe API clients from OpenAPI and GraphQL specifications. It generates TypeScript types, Zod validation schemas, HTTP clients, and React Query/SWR hooks.

## Architecture

```
Input Sources          Parsers              IR Schema              Generators           Output Files
┌─────────────┐    ┌───────────────┐    ┌─────────────────┐    ┌──────────────┐    ┌────────────┐
│ OpenAPI     │───▶│ OpenAPIParser │───▶│                 │───▶│ TypeScriptGen│───▶│ types.ts   │
│ (YAML/JSON) │    └───────────────┘    │   IRSchema      │    └──────────────┘    └────────────┘
└─────────────┘                         │   - Types       │    ┌──────────────┐    ┌────────────┐
┌─────────────┐    ┌───────────────┐    │   - Endpoints   │───▶│ ZodGen       │───▶│ schemas.ts │
│ GraphQL     │───▶│ GraphQLParser │───▶│   - Operations  │    └──────────────┘    └────────────┘
│ Schema      │    └───────────────┘    │   - Parameters  │    ┌──────────────┐    ┌────────────┐
└─────────────┘                         │   - Responses   │───▶│ ReactQueryGen│───▶│ hooks.ts   │
                                        └─────────────────┘    └──────────────┘    └────────────┘
                                                               ┌──────────────┐    ┌────────────┐
                                                          ────▶│ ClientGen    │───▶│ client.ts  │
                                                               └──────────────┘    └────────────┘
```

## Key Files and Their Purpose

### Core IR (Intermediate Representation)
- `src/ir/types.ts` - Core type definitions that bridge parsers and generators
- `src/ir/validator.ts` - Validates IR schema consistency

### Parsers
- `src/parsers/openapi/parser.ts` - Main OpenAPI parsing logic
- `src/parsers/openapi/ref-resolver.ts` - $ref resolution with circular detection
- `src/parsers/openapi/schema-converter.ts` - Converts OpenAPI schemas to IR
- `src/parsers/graphql/parser.ts` - GraphQL schema parsing

### Generators
- `src/generators/base.ts` - Base generator class
- `src/generators/typescript/index.ts` - TypeScript types generator
- `src/generators/zod/index.ts` - Zod schemas generator
- `src/generators/client/index.ts` - HTTP client generator
- `src/generators/react-query/index.ts` - React Query hooks generator
- `src/generators/swr/index.ts` - SWR hooks generator

### CLI
- `src/cli/index.ts` - CLI entry point
- `src/cli/commands/generate.ts` - Generate command implementation
- `src/cli/config.ts` - Configuration loading

### Utilities
- `src/utils/naming.ts` - Case conversion utilities
- `src/utils/fs.ts` - File system helpers
- `src/utils/logger.ts` - Logging utilities
- `src/codegen/printer.ts` - Code printing utilities

## Common Tasks

### Adding a New Generator

1. Create a new directory under `src/generators/`
2. Extend `BaseGenerator` class
3. Implement `generate()` method
4. Register in `src/generators/index.ts`

```typescript
// src/generators/my-generator/index.ts
import { BaseGenerator, GeneratorOptions } from '../base.js';

export class MyGenerator extends BaseGenerator {
  get name() { return 'My Generator'; }
  get filename() { return 'my-output.ts'; }

  generate() {
    this.addHeader();
    // Use this.printer to generate code
    // Use this.schema to access IR schema
  }
}
```

### Adding a New Parser

1. Create a new directory under `src/parsers/`
2. Implement parsing logic that returns `IRSchema`
3. Export from `src/parsers/index.ts`

### Modifying IR Types

The IR types in `src/ir/types.ts` are the foundation. When modifying:
1. Update the type definitions
2. Update parsers that produce the types
3. Update generators that consume the types
4. Update tests

## Build and Test Commands

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Type check
npm run typecheck

# Format code
npm run format

# Development mode with watch
npm run dev
```

## Testing

Test files are in `tests/`:
- `tests/unit/` - Unit tests
- `tests/integration/` - Integration tests
- `tests/fixtures/` - Test fixtures (OpenAPI/GraphQL specs)

Run specific tests:
```bash
npm test -- tests/unit/parsers/openapi.test.ts
```

## Code Style

- ESM modules with `.js` extensions in imports
- Named exports (no default exports for tree-shaking)
- TypeScript strict mode
- Prettier for formatting

## Key Design Decisions

1. **IR Schema as Bridge**: All input formats convert to IR, all generators consume IR
2. **Tree-shaking friendly**: ESM only, named exports, sideEffects: false
3. **Generator independence**: Each generator is standalone and optional
4. **Reference resolution**: Full $ref support including external files and circular detection
5. **Watch mode**: File watching with debounce for development

## Debugging Tips

1. Use `logger.debug()` for verbose output
2. Run with `DEBUG=bridge:*` for detailed logs
3. Check IR schema with validator: `validateIRSchema(schema)`
4. Use printer's `.toString()` to inspect generated code

## Extension Points

- **Custom generators**: Extend `BaseGenerator`
- **Custom parsers**: Return `IRSchema` from your parser
- **Custom scalars**: Configure via `scalarMappings` option
- **Hooks customization**: Modify hook emitters for custom patterns
