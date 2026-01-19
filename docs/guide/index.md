# What is Bridge?

Bridge is a **type-safe API client generator** that transforms OpenAPI and GraphQL specifications into production-ready TypeScript code.

## Why Bridge?

Modern web applications often communicate with REST or GraphQL APIs. Keeping the frontend types in sync with the backend API is tedious and error-prone. Bridge solves this by:

1. **Generating TypeScript types** directly from your API specification
2. **Creating runtime validation** with Zod schemas
3. **Building type-safe HTTP clients** with full IntelliSense support
4. **Producing React Query/SWR hooks** for data fetching
5. **Generating MSW handlers** for testing

## Key Features

### 🔒 Full Type Safety

Every generated type, function, and hook is fully typed. Your IDE will catch errors before runtime.

```typescript
// Type error: Argument of type 'string' is not assignable to parameter of type 'number'
useGetPetById("123"); // ❌ petId must be a number

useGetPetById(123); // ✅ Correctly typed
```

### ⚡ Watch Mode

Bridge watches your API specification and regenerates code on changes:

```bash
npx bridge generate -i ./openapi.yaml -o ./src/api --watch
```

### 🧩 Plugin Architecture

Extend Bridge with custom generators or modify existing ones:

```typescript
// bridge.config.ts
import { defineConfig } from '@bridge/core';
import { myCustomPlugin } from './my-plugin';

export default defineConfig({
  input: { path: './openapi.yaml' },
  output: { dir: './src/api' },
  plugins: [
    'typescript',
    'zod',
    myCustomPlugin,
  ],
});
```

### 📦 Tree-Shakable Output

All generated code is ESM-only with named exports, enabling optimal tree-shaking.

## Supported Input Formats

- **OpenAPI 3.0** (YAML/JSON)
- **OpenAPI 3.1** (YAML/JSON)
- **GraphQL** (schema files)

## Supported Output Generators

| Generator | Description |
|-----------|-------------|
| TypeScript | Type definitions for all schemas and operations |
| Zod | Runtime validation schemas |
| HTTP Client | Fetch-based API client |
| React Query | TanStack Query hooks |
| SWR | SWR hooks |
| MSW | Mock Service Worker handlers |

## Next Steps

- [Getting Started](/guide/getting-started) - Install and generate your first client
- [Configuration](/guide/configuration) - Learn about configuration options
- [TypeScript Generator](/guide/generators/typescript) - Deep dive into type generation
