# Getting Started

This guide will help you set up Bridge and generate your first type-safe API client.

## Prerequisites

- Node.js 18.0.0 or higher
- An OpenAPI 3.x specification file (YAML or JSON)

## Installation

::: code-group

```bash [npm]
npm install -D @bridge/core
```

```bash [pnpm]
pnpm add -D @bridge/core
```

```bash [yarn]
yarn add -D @bridge/core
```

:::

## Quick Start

### 1. Generate from CLI

The fastest way to get started is using the CLI:

```bash
npx bridge generate -i ./openapi.yaml -o ./src/api
```

This will generate:
- `types.ts` - TypeScript type definitions
- `schemas.ts` - Zod validation schemas
- `client.ts` - HTTP client
- `hooks.ts` - React Query hooks

### 2. Create a Configuration File

For more control, create a `bridge.config.ts` file:

```typescript
// bridge.config.ts
import { defineConfig } from '@bridge/core';

export default defineConfig({
  input: {
    path: './openapi.yaml',
  },
  output: {
    dir: './src/api',
  },
  plugins: [
    'typescript',
    'zod',
    'client',
    'react-query',
  ],
});
```

Then run:

```bash
npx bridge generate
```

### 3. Use the Generated Code

```typescript
// src/App.tsx
import { useGetPets, useCreatePet } from './api/hooks';
import type { Pet, CreatePetRequest } from './api/types';

function PetList() {
  const { data: pets, isLoading } = useGetPets();

  if (isLoading) return <div>Loading...</div>;

  return (
    <ul>
      {pets?.map((pet) => (
        <li key={pet.id}>{pet.name}</li>
      ))}
    </ul>
  );
}
```

## Watch Mode

Enable watch mode to regenerate code when your API spec changes:

```bash
npx bridge generate --watch
```

Or in your config:

```typescript
export default defineConfig({
  // ...
  watch: true,
});
```

## TypeScript Configuration

Ensure your `tsconfig.json` includes the generated files:

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true
  },
  "include": ["src/**/*"]
}
```

## Next Steps

- [Configuration](/guide/configuration) - Learn about all configuration options
- [TypeScript Generator](/guide/generators/typescript) - Customize type generation
- [React Query Hooks](/guide/generators/react-query) - Configure hook generation
