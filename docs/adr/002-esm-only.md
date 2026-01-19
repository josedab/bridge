# ADR-002: ESM-Only Package

## Status

Accepted

## Context

Node.js supports two module systems:
- **CommonJS (CJS)**: The original Node.js module system using `require()` and `module.exports`
- **ECMAScript Modules (ESM)**: The standard JavaScript module system using `import` and `export`

Many packages publish "dual" builds supporting both formats, which increases complexity and bundle size. We need to decide whether Bridge should:
1. Support both CJS and ESM
2. Support only ESM
3. Support only CJS

## Decision

Bridge will be an **ESM-only package**.

Configuration in `package.json`:
```json
{
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  }
}
```

All internal imports use `.js` extensions as required by ESM:
```typescript
import { parseOpenAPI } from './parsers/openapi/index.js';
```

## Consequences

### Positive

- **Simpler build**: No need to maintain dual CJS/ESM builds, reducing build complexity and CI time.

- **Tree-shaking**: ESM enables static analysis for tree-shaking. Combined with `"sideEffects": false`, bundlers can eliminate unused code.

- **Modern standard**: ESM is the JavaScript standard. Node.js 18+ (our minimum version) has excellent ESM support.

- **Smaller bundle**: No CJS wrapper code or interop shims needed.

- **Top-level await**: ESM supports top-level await, enabling cleaner async initialization patterns.

- **Better tooling**: Modern tools (Vite, esbuild, tsup) are optimized for ESM.

### Negative

- **CJS incompatibility**: Projects still using CommonJS (`require()`) cannot directly import Bridge. They must use dynamic `import()`:
  ```javascript
  // CommonJS project using Bridge
  const bridge = await import('@bridge/core');
  ```

- **Older Node.js**: Node.js versions before 12.17.0 don't support ESM. However, our minimum is Node 18, so this isn't a concern.

- **Jest configuration**: Jest requires additional configuration for ESM. Vitest (which we use) handles ESM natively.

## Alternatives Considered

### Dual CJS/ESM build
Publish both formats using conditional exports. Rejected because:
- Increases build complexity
- Can cause "dual package hazard" where both versions are loaded
- Adds maintenance burden

### CJS-only
Use CommonJS for maximum compatibility. Rejected because:
- Prevents tree-shaking
- Goes against the direction of the JavaScript ecosystem
- Limits use of modern language features

## Migration Guide for CJS Users

If you're using CommonJS and need to import Bridge:

```javascript
// Option 1: Dynamic import (recommended)
async function main() {
  const { parseOpenAPI, TypeScriptGenerator } = await import('@bridge/core');
  // ... use Bridge
}

// Option 2: Convert your project to ESM
// In package.json, add: "type": "module"
// Rename .js files to .mjs or update imports to use .js extensions
```

## References

- [Node.js ESM Documentation](https://nodejs.org/api/esm.html)
- [Pure ESM Package](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c) by Sindre Sorhus
- [Dual Package Hazard](https://nodejs.org/api/packages.html#dual-package-hazard)
