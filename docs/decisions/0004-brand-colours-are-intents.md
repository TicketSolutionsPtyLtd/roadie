# 0004 Brand colours are hue-named intents

## Context

The brand guidelines name colours that Roadie already has as scales. A second
colour mechanism would make choosing the right option harder.

## Decision

Brand colours use the intent mechanism `brand-secondary` already uses, named
by hue. `brand-purple` points at the purple values, and `brand-blue` and
`brand-orange` alias `brand` and `brand-secondary`, which stay. Green, yellow,
and red stay status-only until a real block needs one. Brand lighting names
are a docs lookup, not new utilities.

## Consequences

Brand work reuses intents and emphasis. Adding a brand intent later is cheap;
removing one is a one-way door.

## Links

- INNO-1148, decisions 2 and 4
- [0005 Roadie mostly wins](0005-roadie-mostly-wins.md)
