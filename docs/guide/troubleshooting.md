# Troubleshooting

This guide covers common issues and their solutions when using Bridge.

## Code Formatting

### Formatter Not Working

**Symptom:** Generated code is not formatted (no consistent indentation, single-line imports, etc.)

**Cause:** Bridge uses Prettier for code formatting, but it's an optional peer dependency.

**Solution:**

1. Install Prettier in your project:

```bash
npm install -D prettier
```

2. Optionally create a `.prettierrc` file to customize formatting:

```json
{
  "printWidth": 100,
  "singleQuote": true,
  "trailingComma": "es5"
}
```

Bridge will automatically use your project's Prettier configuration.

### Formatting Errors

**Symptom:** Warning message: "Code formatting failed: [error message]"

**Cause:** Generated code caused a Prettier parsing error, or Prettier configuration is invalid.

**Solution:**

1. Check if Prettier is installed correctly
2. Verify your `.prettierrc` configuration is valid
3. If the issue persists, you can disable formatting:

```typescript
// bridge.config.ts
export default defineConfig({
  // ...
  format: false,
});
```

## GraphQL Parser

### Operations Return Unknown Type

**Symptom:** GraphQL operations have return type `unknown` instead of the expected type.

**Cause:** The GraphQL parser currently has limited support for operation return type inference from selection sets.

**Known Limitations:**

- Complex selection sets may not be fully resolved
- Fragment support is limited
- Nested field selections may return `unknown`

**Workaround:** Use TypeScript type assertions or manually define response types:

```typescript
const result = await client.getUser() as User;
```

### Schema Parsing Errors

**Symptom:** Error parsing GraphQL schema file.

**Solution:**

1. Validate your schema with a GraphQL linter
2. Ensure the file encoding is UTF-8
3. Check for syntax errors in type definitions

## Plugin Configuration

### Plugin Options Not Taking Effect

**Symptom:** Custom plugin options are ignored.

**Cause:** There was a bug in earlier versions where plugin options weren't passed to the plugin context. This has been fixed.

**Solution:**

1. Update to the latest version of Bridge
2. Verify your configuration syntax:

```typescript
export default defineConfig({
  plugins: [
    {
      plugin: 'typescript',
      options: {
        enumStyle: 'const',
      },
    },
  ],
});
```

### Plugin Not Found

**Symptom:** Error: "Plugin 'xxx' not found"

**Solution:**

1. Check the plugin name is correct (built-in plugins: `typescript`, `zod`, `client`, `react-query`, `swr`, `msw`)
2. For custom plugins, ensure they're imported correctly:

```typescript
import { myCustomPlugin } from './my-plugin';

export default defineConfig({
  plugins: [myCustomPlugin()],
});
```

## Watch Mode

### Watch Mode Not Detecting Changes

**Symptom:** File changes don't trigger regeneration in watch mode.

**Solution:**

1. Ensure the input file path is correct
2. Check file system permissions
3. On some systems, network drives may not support file watching

```bash
# Verify file watching with verbose output
DEBUG=bridge:* npx bridge generate --watch
```

### High CPU Usage in Watch Mode

**Symptom:** Watch mode causes high CPU usage.

**Cause:** File watching on large directories or many files.

**Solution:**

1. Be specific with input file paths
2. Exclude `node_modules` from watching (done by default)

## Node.js Version

### Incompatible Node Version

**Symptom:** Error about unsupported Node.js version or ES module issues.

**Cause:** Bridge requires Node.js 18.0.0 or higher.

**Solution:**

1. Check your Node version:

```bash
node --version
```

2. Update Node.js if needed:

```bash
# Using nvm
nvm install 18
nvm use 18
```

## OpenAPI Parsing

### $ref Resolution Errors

**Symptom:** Error resolving `$ref` references in OpenAPI spec.

**Solution:**

1. Ensure all referenced schemas exist
2. Check for typos in reference paths
3. For external file references, ensure files are accessible:

```yaml
# External references must be relative to the main file
$ref: './schemas/Pet.yaml#/Pet'
```

### Circular References

**Symptom:** Maximum call stack exceeded or infinite loop.

**Cause:** Circular `$ref` references in the OpenAPI spec.

**Solution:** Bridge handles circular references, but deeply nested circular structures may cause issues. Simplify your schema structure if possible.

## Build Issues

### TypeScript Errors in Generated Code

**Symptom:** Type errors when compiling generated code.

**Solution:**

1. Ensure `tsconfig.json` is compatible with ESM:

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true
  }
}
```

2. Check that peer dependencies are installed (e.g., `zod`, `@tanstack/react-query`)

### Import Path Issues

**Symptom:** Module not found errors for generated imports.

**Cause:** Generated code uses `.js` extensions for ESM compatibility.

**Solution:**

Ensure your bundler or TypeScript config supports this:

```json
// tsconfig.json
{
  "compilerOptions": {
    "moduleResolution": "bundler"
  }
}
```

## Getting More Help

If your issue isn't covered here:

1. Check the [GitHub Issues](https://github.com/bridge-codes/bridge/issues) for similar problems
2. Ask in [GitHub Discussions](https://github.com/bridge-codes/bridge/discussions)
3. Enable debug logging for more information:

```bash
DEBUG=bridge:* npx bridge generate
```
