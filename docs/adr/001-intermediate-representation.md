# ADR-001: Intermediate Representation Pattern

## Status

Accepted

## Context

Bridge needs to support multiple input formats (OpenAPI 3.0, OpenAPI 3.1, GraphQL) and multiple output generators (TypeScript types, Zod schemas, HTTP clients, React Query hooks, SWR hooks, Apollo hooks, MSW mocks, etc.).

A naive approach would be to implement direct conversions from each input format to each output format, resulting in O(n*m) implementations where n is the number of input formats and m is the number of output formats.

With 3 input formats and 10+ output generators, this would require 30+ separate conversion implementations, each with their own edge cases and maintenance burden.

## Decision

We will use an **Intermediate Representation (IR)** as a canonical internal format that:

1. All parsers convert input formats INTO the IR
2. All generators convert FROM the IR to their output format

The IR schema (`src/ir/types.ts`) captures all the information needed to generate any output:

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
```

The IR includes:
- **Metadata**: API title, version, description, base URL
- **Types**: Objects, arrays, primitives, enums, unions, intersections
- **Endpoints**: HTTP methods, paths, parameters, request bodies, responses
- **Operations**: GraphQL queries, mutations, subscriptions
- **Security**: Authentication schemes

## Consequences

### Positive

- **Linear complexity**: Adding a new input format requires only 1 parser implementation. Adding a new output generator requires only 1 generator implementation. Total implementations = O(n + m) instead of O(n * m).

- **Decoupled components**: Parsers and generators are completely independent. A parser author doesn't need to know about generators, and vice versa.

- **Testability**: The IR serves as a clear contract. Parsers can be tested by verifying their IR output. Generators can be tested with synthetic IR input.

- **Extensibility**: Third-party plugins can create new parsers or generators without modifying core code.

- **Consistency**: All generators work from the same normalized representation, ensuring consistent behavior across output formats.

### Negative

- **IR design complexity**: The IR must be expressive enough to capture all nuances of all input formats. Features unique to one input format may be difficult to represent.

- **Information loss**: Some input-format-specific features may not have IR equivalents and will be lost during parsing.

- **Maintenance burden**: The IR schema becomes a critical dependency. Changes to it may require updates to all parsers and generators.

- **Two-phase debugging**: Issues may arise in either the parser (input → IR) or generator (IR → output) phase, requiring investigation of both.

## Alternatives Considered

### Direct conversion
Each input-output pair has its own converter. Rejected due to O(n*m) complexity.

### Template-based generation
Use text templates (like Handlebars) for output. Rejected because templates are harder to type-check and test than programmatic generation.

### AST-based IR
Use a language-agnostic AST as the IR. Rejected because it's overly complex for our use case and ties us to specific AST formats.

## References

- [Compiler Design - Intermediate Representation](https://en.wikipedia.org/wiki/Intermediate_representation)
- Similar pattern used by: Prisma, GraphQL Code Generator, OpenAPI Generator
