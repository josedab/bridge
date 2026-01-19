# Changesets

This folder contains changesets - files that describe changes to the package.

## Creating a Changeset

When you make a change that should be documented in the changelog, run:

```bash
npm run changeset
```

This will prompt you to:
1. Select the type of change (major, minor, patch)
2. Write a summary of the change

## Changeset Types

- **major**: Breaking changes
- **minor**: New features (backwards compatible)
- **patch**: Bug fixes (backwards compatible)

## More Information

For more details, see the [Changesets documentation](https://github.com/changesets/changesets).
