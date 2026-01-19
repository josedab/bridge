# Contributing to Bridge

Thank you for your interest in contributing to Bridge! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to abide by our code of conduct: be respectful, inclusive, and constructive in all interactions.

## Getting Started

### Prerequisites

- Node.js 18 or higher (we recommend using [nvm](https://github.com/nvm-sh/nvm))
- npm 9 or higher

### Development Setup

1. Fork and clone the repository:

   ```bash
   git clone https://github.com/YOUR_USERNAME/bridge.git
   cd bridge
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Build the project:

   ```bash
   npm run build
   ```

4. Run the tests to ensure everything is working:

   ```bash
   npm test
   ```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Build the project with tsup |
| `npm run dev` | Build in watch mode |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Run ESLint with auto-fix |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check code formatting |

## Development Workflow

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `chore/` - Maintenance tasks

Example: `feature/add-graphql-subscriptions`

### Making Changes

1. Create a new branch from `main`:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and ensure:
   - All tests pass: `npm test`
   - TypeScript compiles: `npm run typecheck`
   - Linting passes: `npm run lint`
   - Code is formatted: `npm run format`

3. Add a changeset for your changes (if applicable):

   ```bash
   npm run changeset
   ```

   Follow the prompts to describe your changes. This is required for any changes that should appear in the changelog.

4. Commit your changes:

   ```bash
   git commit -m "feat: add your feature description"
   ```

   We follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages:
   - `feat:` - New features
   - `fix:` - Bug fixes
   - `docs:` - Documentation changes
   - `style:` - Code style changes (formatting, etc.)
   - `refactor:` - Code refactoring
   - `test:` - Adding or updating tests
   - `chore:` - Maintenance tasks

5. Push your branch and open a pull request.

### Pull Request Process

1. Ensure your PR:
   - Has a clear title and description
   - Links to related issues
   - Includes tests for new functionality
   - Updates documentation if needed
   - Has a changeset (for user-facing changes)

2. Wait for CI checks to pass.

3. Request a review from maintainers.

4. Address any feedback and update your PR.

5. Once approved, your PR will be merged.

## Code Style

### TypeScript Guidelines

- Use TypeScript strict mode (all strict flags enabled)
- Prefer `interface` over `type` for object shapes
- Use named exports (no default exports)
- Use `.js` extensions in imports (for ESM compatibility)
- Add JSDoc comments for public APIs

### Code Formatting

We use Prettier for code formatting. The pre-commit hook will automatically format staged files, but you can also run:

```bash
npm run format
```

### Testing

- Write tests for all new features and bug fixes
- Place tests in the `tests/` directory
- Use descriptive test names
- Aim for high coverage, but prioritize meaningful tests

Example test structure:

```typescript
import { describe, it, expect } from 'vitest';

describe('MyFeature', () => {
  describe('when given valid input', () => {
    it('should return expected output', () => {
      // Test implementation
    });
  });

  describe('when given invalid input', () => {
    it('should throw an error', () => {
      // Test implementation
    });
  });
});
```

## Project Structure

```
bridge/
├── src/
│   ├── cli/           # CLI implementation
│   ├── codegen/       # Code generation utilities
│   ├── generators/    # Output generators (TypeScript, Zod, etc.)
│   ├── ir/            # Intermediate Representation types
│   ├── parsers/       # Input parsers (OpenAPI, GraphQL)
│   └── utils/         # Shared utilities
├── tests/
│   ├── fixtures/      # Test fixtures (OpenAPI/GraphQL specs)
│   ├── integration/   # Integration tests
│   └── unit/          # Unit tests
└── examples/          # Example usage
```

## Adding New Features

### Adding a New Generator

1. Create a new directory under `src/generators/`
2. Extend the `BaseGenerator` class
3. Implement the `generate()` method
4. Export from `src/generators/index.ts`
5. Add tests in `tests/unit/generators/`

### Adding a New Parser

1. Create a new directory under `src/parsers/`
2. Implement parsing logic that returns `IRSchema`
3. Export from `src/parsers/index.ts`
4. Add tests in `tests/unit/parsers/`

## Reporting Issues

When reporting issues, please include:

- A clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Your environment (Node.js version, OS, etc.)
- Relevant input files (OpenAPI/GraphQL specs)

## Getting Help

- Check existing [issues](https://github.com/bridge-codes/bridge/issues) for similar problems
- Open a new issue if you need help
- Be patient and respectful when asking for help

## License

By contributing to Bridge, you agree that your contributions will be licensed under the MIT License.
