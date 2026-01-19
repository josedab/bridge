# Basic OpenAPI Example

This example demonstrates the basic usage of Bridge with an OpenAPI specification.

## Features Demonstrated

- TypeScript types generation
- Zod schemas for runtime validation
- HTTP client generation
- Type guards for runtime type checking
- React Query hooks (generated but not used in this Node.js example)

## Project Structure

```
basic-openapi/
├── petstore.yaml        # OpenAPI specification
├── bridge.config.ts     # Bridge configuration
├── src/
│   ├── index.ts         # Example usage
│   └── generated/       # Generated code (after running generate)
│       ├── types.ts     # TypeScript types
│       ├── schemas.ts   # Zod schemas
│       ├── client.ts    # HTTP client
│       ├── hooks.ts     # React Query hooks
│       └── index.ts     # Barrel export
└── package.json
```

## Usage

1. Install dependencies:
```bash
npm install
```

2. Generate the API client:
```bash
npm run generate
```

3. Run the example:
```bash
npm run dev
```

## Generated Code

After running `npm run generate`, you'll have:

### Types (`types.ts`)
- `Pet`, `Owner`, `CreatePetRequest`, etc.
- Type guards like `isPet()`, `isOwner()`
- Endpoint parameter types

### Schemas (`schemas.ts`)
- Zod schemas for runtime validation
- `PetSchema`, `OwnerSchema`, etc.

### Client (`client.ts`)
- `apiClient` with methods for each endpoint
- `listPets()`, `createPet()`, `getPet()`, etc.

### Hooks (`hooks.ts`)
- React Query hooks for data fetching
- `useListPets()`, `useCreatePet()`, etc.

## Configuration

See `bridge.config.ts` for the configuration options used in this example:

```typescript
export default defineConfig({
  input: {
    path: './petstore.yaml',
    type: 'openapi',
  },
  output: {
    dir: './src/generated',
  },
  generators: {
    typescript: {
      generateTypeGuards: true,
    },
    zod: true,
    client: {
      baseUrl: 'https://api.petstore.example.com/v1',
    },
    hooks: {
      type: 'react-query',
    },
  },
});
```
