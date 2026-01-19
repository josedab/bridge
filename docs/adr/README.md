# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for the Bridge project.

ADRs document significant architectural decisions made during the development of Bridge, including the context, decision, and consequences of each choice.

## Index

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [001](./001-intermediate-representation.md) | Intermediate Representation Pattern | Accepted | 2026-01-18 |
| [002](./002-esm-only.md) | ESM-Only Package | Accepted | 2026-01-18 |
| [003](./003-plugin-architecture.md) | Plugin Architecture | Accepted | 2026-01-18 |

## What is an ADR?

An Architecture Decision Record captures an important architectural decision along with its context and consequences. ADRs help:

- Document why decisions were made
- Onboard new contributors to the project's design philosophy
- Provide historical context for future decisions
- Enable informed re-evaluation of past decisions

## Template

```markdown
# ADR-NNN: Title

## Status
[Proposed | Accepted | Deprecated | Superseded by ADR-XXX]

## Context
What is the issue that we're seeing that motivates this decision or change?

## Decision
What is the change that we're proposing and/or doing?

## Consequences
What becomes easier or more difficult to do because of this change?
```

## References

- [Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) by Michael Nygard
- [ADR GitHub Organization](https://adr.github.io/)
