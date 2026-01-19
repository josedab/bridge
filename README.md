# Bridge

[![CI](https://github.com/bridge-codes/bridge/actions/workflows/ci.yml/badge.svg)](https://github.com/bridge-codes/bridge/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@bridge/core.svg)](https://www.npmjs.com/package/@bridge/core)
[![npm downloads](https://img.shields.io/npm/dm/@bridge/core.svg)](https://www.npmjs.com/package/@bridge/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![codecov](https://codecov.io/gh/bridge-codes/bridge/branch/main/graph/badge.svg)](https://codecov.io/gh/bridge-codes/bridge)

Type-safe API client generator from OpenAPI and GraphQL specifications.

Bridge generates TypeScript types, Zod validation schemas, HTTP clients, and React Query/SWR hooks from your API specs.

## Features

- **OpenAPI 3.0/3.1** to TypeScript generation
- **GraphQL schema** to TypeScript generation
- **Zod schemas** for runtime type validation
- **React Query** and **SWR** hook generation
- **Tree-shaking friendly** output (ESM, named exports)
- **Watch mode** for development

## Installation

```bash
npm install @bridge/core
# or
pnpm add @bridge/core
# or
yarn add @bridge/core
```

## Quick Start

### CLI Usage

```bash
# Initialize a config file
bridge init --type openapi

# Generate from OpenAPI spec
bridge generate -i openapi.yaml -o src/api

# Generate with watch mode
bridge generate -i openapi.yaml -o src/api --watch

# Generate without Zod schemas
bridge generate -i openapi.yaml -o src/api --no-zod

# Generate SWR hooks instead of React Query
bridge generate -i openapi.yaml -o src/api --swr
```

### Configuration File

Create a `bridge.config.ts` file in your project root:

```typescript
import { defineConfig } from '@bridge/core';

export default defineConfig({
  input: {
    path: './openapi.yaml',
    type: 'openapi',
  },
  output: {
    dir: './src/api',
  },
  generators: {
    typescript: true,
    zod: true,
    client: {
      baseUrl: 'https://api.example.com',
    },
    hooks: {
      type: 'react-query',
    },
  },
});
```

Then run:

```bash
bridge generate
```

## Generated Output

Bridge generates the following files:

### `types.ts` - TypeScript Types

```typescript
export interface Pet {
  id: string;
  name: string;
  status: PetStatus;
}

export enum PetStatus {
  Available = 'available',
  Pending = 'pending',
  Sold = 'sold',
}

export interface GetPetParams {
  path: {
    petId: string;
  };
}

export type GetPetResponse = Pet;
```

### `schemas.ts` - Zod Schemas

```typescript
import { z } from 'zod';

export const petSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['available', 'pending', 'sold']),
});

export type Pet = z.infer<typeof petSchema>;
```

### `client.ts` - HTTP Client

```typescript
export class ApiClient {
  async getPet(params: GetPetParams, signal?: AbortSignal): Promise<GetPetResponse> {
    return this.http.request('GET', `/pets/${params.path.petId}`, { signal });
  }

  async createPet(params: CreatePetParams): Promise<CreatePetResponse> {
    return this.http.request('POST', '/pets', { body: params.body });
  }
}

export const apiClient = new ApiClient();
```

### `hooks.ts` - React Query Hooks

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';

export const queryKeys = {
  getPet: (params: GetPetParams) => ['getPet', params] as const,
  listPets: ['listPets'] as const,
} as const;

export function useGetPet(
  params: GetPetParams,
  options?: Omit<UseQueryOptions<Pet, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.getPet(params),
    queryFn: ({ signal }) => apiClient.getPet(params, signal),
    ...options,
  });
}

export function useCreatePet(
  options?: UseMutationOptions<Pet, Error, CreatePetInput>
) {
  return useMutation({
    mutationFn: (data) => apiClient.createPet({ body: data }),
    ...options,
  });
}
```

## Usage in Your App

```typescript
import { useGetPet, useCreatePet, apiClient } from './api';

// Using hooks
function PetDetails({ petId }: { petId: string }) {
  const { data: pet, isLoading } = useGetPet({ path: { petId } });

  if (isLoading) return <div>Loading...</div>;
  return <div>{pet?.name}</div>;
}

// Using client directly
async function fetchPet(petId: string) {
  const pet = await apiClient.getPet({ path: { petId } });
  console.log(pet.name);
}
```

## CLI Commands

### `bridge generate`

Generate code from an API specification.

| Option | Description |
|--------|-------------|
| `-i, --input <path>` | Input file path (OpenAPI or GraphQL) |
| `-o, --output <dir>` | Output directory |
| `-c, --config <path>` | Path to config file |
| `--no-typescript` | Disable TypeScript types |
| `--no-zod` | Disable Zod schemas |
| `--no-client` | Disable HTTP client |
| `--no-hooks` | Disable hooks |
| `--swr` | Use SWR instead of React Query |
| `-w, --watch` | Watch for changes |

### `bridge init`

Create a configuration file.

| Option | Description |
|--------|-------------|
| `-t, --type <type>` | Input type (openapi or graphql) |
| `-f, --force` | Overwrite existing config |

## Configuration Options

```typescript
interface BridgeConfig {
  input: {
    path: string;
    type?: 'openapi' | 'graphql';
  };
  output: {
    dir: string;
  };
  generators?: {
    typescript?: boolean | {
      enumsAsConst?: boolean;
      generateTypeGuards?: boolean;
    };
    zod?: boolean | {
      inferTypes?: boolean;
    };
    client?: boolean | {
      baseUrl?: string;
      style?: 'functions' | 'class';
    };
    hooks?: {
      type: 'react-query' | 'swr';
      suspense?: boolean;
      infinite?: boolean;
    };
  };
  watch?: boolean | {
    debounce?: number;
  };
}
```

## Programmatic API

```typescript
import { parseOpenAPI, TypeScriptGenerator, ZodGenerator } from '@bridge/core';

// Parse OpenAPI spec
const schema = await parseOpenAPI('./openapi.yaml');

// Generate TypeScript types
const tsGenerator = new TypeScriptGenerator(schema, {
  outputDir: './src/api',
});
await tsGenerator.run();
await tsGenerator.write();

// Generate Zod schemas
const zodGenerator = new ZodGenerator(schema, {
  outputDir: './src/api',
});
await zodGenerator.run();
await zodGenerator.write();
```

## Supported Features

### OpenAPI

- ✅ OpenAPI 3.0 and 3.1
- ✅ YAML and JSON formats
- ✅ `$ref` resolution (local and external)
- ✅ `oneOf`, `anyOf`, `allOf` composition
- ✅ Discriminated unions
- ✅ Enums (string and numeric)
- ✅ All parameter types (path, query, header)
- ✅ Request bodies
- ✅ Response types
- ✅ Nullable types

### GraphQL

- ✅ Schema parsing
- ✅ Type generation
- ✅ Enums and unions
- ✅ Input types
- ✅ Custom scalars

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## Security

For information about reporting security vulnerabilities, please see our [Security Policy](SECURITY.md).

## License

MIT - see [LICENSE](LICENSE) for details.
