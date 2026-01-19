# Frequently Asked Questions

## General

### What is Bridge?

Bridge is a TypeScript code generator that produces type-safe API clients from OpenAPI and GraphQL specifications. It generates TypeScript types, Zod validation schemas, HTTP clients, and data-fetching hooks for React Query and SWR.

### Why use Bridge over other code generators?

- **Modern ESM-first design** - Tree-shakable output, no CommonJS baggage
- **Plugin architecture** - Generate only what you need, extend with custom plugins
- **Multiple output formats** - Types, validation, clients, and hooks from a single source
- **Strong typing** - Leverages TypeScript's type system for compile-time safety
- **Watch mode** - Fast iteration during development

### What input formats are supported?

- OpenAPI 3.0.x and 3.1.x (YAML or JSON)
- GraphQL schemas (`.graphql` files)

### What output formats are supported?

| Generator    | Output              | Use Case                           |
|-------------|---------------------|------------------------------------|
| TypeScript  | Type definitions    | Type safety across your codebase   |
| Zod         | Validation schemas  | Runtime validation                 |
| Client      | HTTP client         | Making API requests                |
| React Query | Query/mutation hooks| React data fetching with caching   |
| SWR         | SWR hooks           | Alternative React data fetching    |
| MSW         | Mock handlers       | Testing and development mocks      |

## Configuration

### Where should I put my configuration file?

Bridge looks for configuration in these locations (in order):

1. `bridge.config.ts`
2. `bridge.config.js`
3. `bridge.config.mjs`

Place it in your project root alongside `package.json`.

### Can I use multiple input files?

Currently Bridge supports a single input file per configuration. For multiple APIs, create separate configurations:

```bash
npx bridge generate -c bridge.users.config.ts
npx bridge generate -c bridge.products.config.ts
```

### How do I customize the output filenames?

Use plugin options:

```typescript
export default defineConfig({
  plugins: [
    {
      plugin: 'typescript',
      options: {
        filename: 'api-types.ts',
      },
    },
  ],
});
```

## TypeScript Generator

### How do I change enum style?

```typescript
{
  plugin: 'typescript',
  options: {
    // Use 'const' for const enums, 'enum' for regular enums
    enumStyle: 'const',
  },
}
```

### How do I make all properties optional?

This isn't directly supported. The generator respects the `required` field in your OpenAPI spec. If you need optional types, modify your spec or post-process the output.

### Can I generate branded types?

Yes, Bridge supports branded types for type-safe IDs:

```typescript
{
  plugin: 'typescript',
  options: {
    brandedTypes: true,
  },
}
```

## Zod Generator

### Are Zod schemas tree-shakable?

Yes. Each schema is exported individually, so your bundler can eliminate unused schemas.

### How do I use Zod schemas for form validation?

```typescript
import { createPetSchema } from './api/schemas';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

function CreatePetForm() {
  const { register, handleSubmit } = useForm({
    resolver: zodResolver(createPetSchema),
  });
  // ...
}
```

## HTTP Client

### How do I add authentication?

Configure the client with default headers:

```typescript
import { apiClient } from './api/client';

// Configure globally
apiClient.configure({
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

// Or per-request
apiClient.getPets({}, {
  headers: { Authorization: `Bearer ${token}` },
});
```

### Can I use a different HTTP library?

The generated client uses the Fetch API. For other libraries, create a custom plugin or wrap the generated client.

### How do I handle errors?

```typescript
try {
  const pet = await apiClient.getPet({ path: { id: '123' } });
} catch (error) {
  if (error instanceof ApiError) {
    console.error('API error:', error.status, error.message);
  }
}
```

## React Query / SWR

### Which data-fetching library should I use?

Both are excellent choices:

- **React Query** - More features, better for complex caching scenarios
- **SWR** - Simpler API, lighter weight

### How do I invalidate queries?

```typescript
import { useQueryClient } from '@tanstack/react-query';
import { petKeys } from './api/hooks';

function CreatePetButton() {
  const queryClient = useQueryClient();
  const mutation = useCreatePet({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: petKeys.all });
    },
  });
}
```

### Can I use the hooks in Next.js?

Yes, but ensure you configure the QueryClientProvider correctly for SSR:

```typescript
// app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export function Providers({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

## MSW (Mock Service Worker)

### How do I use MSW mocks in tests?

```typescript
import { server } from './mocks/server';
import { handlers } from './api/mocks';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Use custom handlers in specific tests
test('handles error', async () => {
  server.use(
    http.get('/pets', () => {
      return HttpResponse.json({ error: 'Failed' }, { status: 500 });
    })
  );
  // ...
});
```

### Can I customize mock data?

Yes, use the generated faker functions:

```typescript
import { fakePet } from './api/mocks';

const customPet = fakePet({
  name: 'Custom Name',
  status: 'adopted',
});
```

## Plugins

### How do I create a custom plugin?

```typescript
import { definePlugin } from '@bridge/core';

export const myPlugin = definePlugin((options) => ({
  name: 'my-plugin',
  generate(context) {
    // Access context.schema for the parsed API
    // Return generated files
    return [
      {
        path: 'my-output.ts',
        content: '// Generated content',
      },
    ];
  },
}));
```

### Can I modify the output of built-in plugins?

Yes, use the `afterGenerate` hook:

```typescript
{
  plugin: myPostProcessor,
  hooks: {
    afterGenerate(context, files) {
      return files.map(file => ({
        ...file,
        content: file.content.replace(/foo/g, 'bar'),
      }));
    },
  },
}
```

## Performance

### Is the generated code tree-shakable?

Yes. Bridge generates ESM-only output with named exports and `sideEffects: false`.

### How large is the generated code?

It depends on your API size. For a typical 50-endpoint API:

- Types: ~5-10KB
- Zod schemas: ~10-20KB
- Client: ~5-10KB
- Hooks: ~10-15KB

With tree-shaking, only what you import is bundled.

## Troubleshooting

For more detailed troubleshooting, see the [Troubleshooting Guide](/guide/troubleshooting).
