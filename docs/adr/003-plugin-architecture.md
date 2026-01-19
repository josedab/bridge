# ADR-003: Plugin Architecture

## Status

Accepted

## Context

Bridge generates multiple types of output (TypeScript types, Zod schemas, HTTP clients, hooks, mocks). Users have different needs:

- Some want only TypeScript types
- Some want types + Zod schemas
- Some want the full stack with React Query hooks
- Some want custom generators for their specific needs

We need an architecture that:
1. Allows users to select which outputs to generate
2. Enables third-party extensions
3. Keeps the core package lightweight
4. Provides consistent configuration

## Decision

Bridge uses a **plugin architecture** where each generator is wrapped in a plugin interface.

### Plugin Interface

```typescript
interface BridgePlugin {
  name: string;
  description?: string;

  // Create a generator instance
  createGenerator(schema: IRSchema, options: PluginOptions): BaseGenerator;

  // Lifecycle hooks (optional)
  beforeGenerate?(context: GeneratorContext): void | Promise<void>;
  afterGenerate?(context: GeneratorContext, files: GeneratedFile[]): void | Promise<void>;
}
```

### Built-in Plugins

Located in `src/plugins/builtin/`:
- `typescript` - TypeScript type definitions
- `zod` - Zod validation schemas
- `client` - HTTP client
- `react-query` - React Query hooks
- `swr` - SWR hooks
- `apollo` - Apollo Client hooks
- `urql` - URQL hooks
- `msw` - Mock Service Worker handlers
- `tanstack-router` - TanStack Router integration

### Configuration

Users enable plugins in `bridge.config.ts`:

```typescript
export default defineConfig({
  input: { path: './openapi.yaml' },
  output: { dir: './src/api' },
  plugins: [
    'typescript',                    // Built-in by name
    ['zod', { inferTypes: true }],   // With options
    myCustomPlugin,                   // Custom plugin instance
  ],
});
```

### Plugin Loading

The `PluginLoader` (`src/plugins/loader.ts`) handles:
1. Resolving built-in plugins by name
2. Loading custom plugins from paths or instances
3. Validating plugin interfaces
4. Merging plugin options with defaults

## Consequences

### Positive

- **Modularity**: Each generator is self-contained and can be developed/tested independently.

- **Extensibility**: Third parties can create custom plugins without forking Bridge:
  ```typescript
  const myPlugin: BridgePlugin = {
    name: 'my-custom-generator',
    createGenerator(schema, options) {
      return new MyCustomGenerator(schema, options);
    },
  };
  ```

- **Selective generation**: Users only generate what they need, keeping output minimal.

- **Lifecycle hooks**: Plugins can perform setup/teardown, validation, or post-processing.

- **Configuration consistency**: All plugins use the same configuration pattern.

### Negative

- **Learning curve**: Plugin authors need to understand the plugin interface and IR schema.

- **Indirection**: More abstraction layers between user configuration and code generation.

- **Discovery**: Finding third-party plugins requires external documentation or a plugin registry.

- **Version compatibility**: Plugins may break when Bridge's internal APIs change.

## Alternatives Considered

### Monolithic generator
Single generator that outputs everything based on flags. Rejected because:
- Doesn't support third-party extensions
- Makes the codebase harder to maintain
- Forces users to understand all options even if they only need one output

### Separate packages
Each generator as a separate npm package. Rejected because:
- Increases installation complexity
- Makes version coordination difficult
- Fragments the documentation

### Template-based customization
Allow users to provide templates for output. Rejected because:
- Templates are harder to type-check
- Limited programmatic control
- Steeper learning curve for complex customizations

## Future Considerations

- **Plugin registry**: A central place to discover community plugins
- **Plugin scaffolding**: CLI command to generate plugin boilerplate
- **Plugin testing utilities**: Helpers for testing custom plugins
- **Composition**: Plugins that compose other plugins

## References

- [Rollup Plugin Development](https://rollupjs.org/plugin-development/)
- [Vite Plugin API](https://vitejs.dev/guide/api-plugin.html)
- [ESLint Custom Rules](https://eslint.org/docs/latest/extend/custom-rules)
