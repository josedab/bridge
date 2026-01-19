# Bridge - Development Task Runner
# Install just: https://github.com/casey/just

# Default recipe - show available commands
default:
    @just --list

# ============================================================
# Development
# ============================================================

# Install dependencies
install:
    npm install

# Build the project
build:
    npm run build

# Build in watch mode
dev:
    npm run dev

# Clean build artifacts
clean:
    rm -rf dist coverage docs/api

# ============================================================
# Testing
# ============================================================

# Run all tests
test:
    npm test

# Run tests in watch mode
test-watch:
    npm run test:watch

# Run tests with coverage report
coverage:
    npm run test:coverage

# Run benchmarks
bench:
    npm run bench

# Run benchmarks once (no watch)
bench-run:
    npm run bench:run

# ============================================================
# Code Quality
# ============================================================

# Run ESLint
lint:
    npm run lint

# Run ESLint with auto-fix
lint-fix:
    npm run lint:fix

# Check code formatting
format-check:
    npm run format:check

# Format code with Prettier
format:
    npm run format

# Run TypeScript type checking
typecheck:
    npm run typecheck

# Run all quality checks (lint, typecheck, test)
check: lint typecheck test
    @echo "All checks passed!"

# ============================================================
# Documentation
# ============================================================

# Build documentation site
docs:
    npm run docs

# Start docs development server
docs-dev:
    npm run docs:dev

# Preview production docs build
docs-preview:
    npm run docs:preview

# Generate API documentation with TypeDoc
docs-api:
    npm run docs:api

# ============================================================
# Release
# ============================================================

# Create a new changeset
changeset:
    npm run changeset

# Apply changeset versions
version:
    npm run version

# Build and publish release
release: check build
    npm run release

# ============================================================
# Utilities
# ============================================================

# Generate code from example OpenAPI spec
generate-example:
    npm run build && node dist/cli/index.js generate -i tests/fixtures/openapi/petstore.yaml -o /tmp/bridge-output

# Show current test coverage summary
coverage-summary:
    npm run test:coverage 2>&1 | grep -A 20 "Coverage summary"

# Update snapshots
update-snapshots:
    npm test -- --update

# Setup git hooks
setup-hooks:
    npm run prepare
