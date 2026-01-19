# Good First Issues for Bridge

This document lists pre-defined issues that are suitable for first-time contributors. Maintainers can create these issues and label them with `good first issue`.

## Testing Issues (High Priority)

These issues help increase our test coverage from ~47% to our target of 80%.

### 1. Add tests for PluginLoader class
**File:** `src/plugins/loader.ts`
**Current coverage:** 0%
**Description:** The PluginLoader class handles loading built-in and custom plugins. We need unit tests for:
- Loading built-in plugins by name
- Loading multiple plugins
- Error handling for invalid plugin names
- Plugin configuration merging

**Skills needed:** TypeScript, Vitest
**Estimated time:** 2-4 hours

---

### 2. Add tests for built-in plugins
**Files:** `src/plugins/builtin/*.ts`
**Current coverage:** 0%
**Description:** Each built-in plugin (typescript, zod, client, react-query, swr, etc.) needs basic tests to verify:
- Plugin name and description
- Default options
- Generator instantiation

**Skills needed:** TypeScript, Vitest
**Estimated time:** 3-5 hours

---

### 3. Add tests for fs utilities
**File:** `src/utils/fs.ts`
**Current coverage:** 43%
**Description:** Add tests for:
- `readFile()` - reading existing and non-existing files
- `writeFile()` - writing files with directory creation
- `ensureDir()` - creating nested directories
- `getExtension()` - extracting file extensions

**Skills needed:** TypeScript, Vitest, mocking file system
**Estimated time:** 2-3 hours

---

### 4. Add tests for naming utilities
**File:** `src/utils/naming.ts`
**Current coverage:** 74%
**Description:** Add tests for edge cases in:
- `pascalCase()` - handling special characters, numbers
- `camelCase()` - handling acronyms
- `toOperationName()` - generating operation names from paths
- `sanitizeIdentifier()` - handling reserved words

**Skills needed:** TypeScript, Vitest
**Estimated time:** 1-2 hours

---

## Documentation Issues

### 5. Add JSDoc comments to public API
**Files:** `src/index.ts`, exported functions
**Description:** Add comprehensive JSDoc comments with examples to all publicly exported functions and classes.

**Skills needed:** TypeScript, technical writing
**Estimated time:** 2-3 hours

---

### 6. Improve error messages in OpenAPI parser
**File:** `src/parsers/openapi/parser.ts`
**Description:** Make error messages more descriptive by including:
- File path and line number when possible
- Suggestions for common mistakes
- Links to OpenAPI spec documentation

**Skills needed:** TypeScript, OpenAPI knowledge
**Estimated time:** 2-4 hours

---

## Feature Issues

### 7. Add --dry-run flag to CLI
**File:** `src/cli/commands/generate.ts`
**Description:** Add a `--dry-run` flag that shows what files would be generated without actually writing them.

**Skills needed:** TypeScript, Commander.js
**Estimated time:** 1-2 hours

---

### 8. Add --quiet flag to CLI
**File:** `src/cli/commands/generate.ts`
**Description:** Add a `--quiet` flag that suppresses all output except errors.

**Skills needed:** TypeScript, Commander.js
**Estimated time:** 1 hour

---

## How to Get Started

1. Comment on the issue you'd like to work on
2. Fork the repository
3. Follow the [Contributing Guide](../CONTRIBUTING.md)
4. Submit a PR referencing the issue

We're happy to provide mentorship for first-time contributors! Ask questions in the issue comments.
