# Configuration

Bridge can be configured using a `bridge.config.ts` file or CLI arguments.

## Configuration File

Create a `bridge.config.ts` in your project root:

```typescript
import { defineConfig } from '@bridge/core';

export default defineConfig({
  // Input configuration
  input: {
    path: './openapi.yaml',
    // Optional: specify format explicitly
    format: 'openapi', // 'openapi' | 'graphql'
  },

  // Output configuration
  output: {
    dir: './src/api',
    // Optional: clean output directory before generation
    clean: true,
  },

  // Plugins to use
  plugins: [
    'typescript',
    ['zod', { inferTypes: true }],
    ['client', { baseUrl: '/api' }],
    'react-query',
  ],

  // Watch mode
  watch: false,
});
```

## Plugin Configuration

Plugins can be configured by passing options in a tuple:

```typescript
plugins: [
  // Just the plugin name
  'typescript',

  // Plugin with options
  ['typescript', {
    emitTypeGuards: true,
    emitHelperTypes: true,
  }],

  // Custom plugin instance
  myCustomPlugin,
]
```

### TypeScript Plugin Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `emitTypeGuards` | `boolean` | `false` | Generate runtime type guard functions |
| `emitHelperTypes` | `boolean` | `false` | Generate helper utility types |
| `strictNullChecks` | `boolean` | `true` | Treat nullable types strictly |

### Zod Plugin Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `inferTypes` | `boolean` | `false` | Export inferred types from schemas |
| `coerce` | `boolean` | `false` | Use coercion for primitives |

### Client Plugin Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `baseUrl` | `string` | `''` | Base URL for API requests |
| `validateResponse` | `boolean` | `false` | Validate responses with Zod |

### React Query Plugin Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `useSuspense` | `boolean` | `false` | Generate suspense-enabled hooks |
| `prefixQueryKeys` | `string` | `''` | Prefix for all query keys |

## CLI Arguments

Configuration can also be provided via CLI:

```bash
npx bridge generate \
  --input ./openapi.yaml \
  --output ./src/api \
  --plugin typescript \
  --plugin zod \
  --watch
```

### CLI Reference

| Argument | Short | Description |
|----------|-------|-------------|
| `--input` | `-i` | Path to input specification |
| `--output` | `-o` | Output directory |
| `--config` | `-c` | Path to config file |
| `--plugin` | `-p` | Plugin to enable (can be repeated) |
| `--watch` | `-w` | Enable watch mode |
| `--clean` | | Clean output directory first |
| `--verbose` | `-v` | Enable verbose logging |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `BRIDGE_CONFIG` | Path to configuration file |
| `DEBUG` | Set to `bridge:*` for debug output |

## Config File Resolution

Bridge looks for configuration files in this order:

1. `bridge.config.ts`
2. `bridge.config.js`
3. `bridge.config.mjs`
4. `.bridgerc.ts`
5. `.bridgerc.js`

## Extending Configurations

You can extend other configurations:

```typescript
import baseConfig from './bridge.config.base';
import { defineConfig } from '@bridge/core';

export default defineConfig({
  ...baseConfig,
  output: {
    ...baseConfig.output,
    dir: './src/generated',
  },
});
```
