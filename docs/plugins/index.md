# Plugins Overview

Bridge uses a plugin architecture to generate different types of output. Each plugin is responsible for generating specific code from the intermediate representation (IR) schema.

## Built-in Plugins

| Plugin | Output | Description |
|--------|--------|-------------|
| `typescript` | `types.ts` | TypeScript type definitions |
| `zod` | `schemas.ts` | Zod validation schemas |
| `client` | `client.ts` | Fetch-based HTTP client |
| `react-query` | `hooks.ts` | TanStack React Query hooks |
| `swr` | `hooks.ts` | SWR hooks |
| `msw` | `mocks.ts` | Mock Service Worker handlers |
| `apollo` | `operations.ts` | Apollo Client operations |
| `urql` | `operations.ts` | URQL operations |

## Using Plugins

### Basic Usage

Enable plugins by name in your configuration:

```typescript
export default defineConfig({
  plugins: ['typescript', 'zod', 'client'],
});
```

### With Options

Pass options using a tuple:

```typescript
export default defineConfig({
  plugins: [
    'typescript',
    ['zod', { inferTypes: true }],
    ['client', { validateResponse: true }],
  ],
});
```

### Selective Generation

Only generate what you need:

```typescript
// Types only
export default defineConfig({
  plugins: ['typescript'],
});

// Types + validation
export default defineConfig({
  plugins: ['typescript', 'zod'],
});

// Full stack
export default defineConfig({
  plugins: [
    'typescript',
    'zod',
    'client',
    'react-query',
    'msw',
  ],
});
```

## Plugin Lifecycle

Plugins have access to lifecycle hooks:

```
┌──────────────────┐
│ beforeGenerate   │  Setup, validation
└────────┬─────────┘
         │
┌────────▼─────────┐
│    generate      │  Code generation
└────────┬─────────┘
         │
┌────────▼─────────┐
│  afterGenerate   │  Post-processing
└──────────────────┘
```

## Creating Custom Plugins

You can create custom plugins to extend Bridge:

```typescript
import type { Plugin, PluginContext } from '@bridge/core';

const myPlugin: Plugin = {
  name: 'my-custom-plugin',

  generate(context: PluginContext) {
    const { schema, outputDir } = context;

    // Generate custom code from IR schema
    const code = generateMyCode(schema);

    return [
      {
        path: 'my-output.ts',
        content: code,
      },
    ];
  },

  hooks: {
    beforeGenerate(context) {
      console.log('Starting generation...');
    },

    afterGenerate(context, files) {
      console.log(`Generated ${files.length} files`);
      return files; // Can modify files
    },
  },
};
```

See [Plugin API](/plugins/api) for detailed documentation.

## Plugin Dependencies

Some plugins depend on others:

| Plugin | Requires |
|--------|----------|
| `react-query` | `typescript`, `client` |
| `swr` | `typescript`, `client` |
| `msw` | `typescript` |
| `client` | `typescript` |

Bridge will warn if dependencies are missing but won't auto-include them.
