# 0001 We own our skills

## Context

Generic third-party skills, superpowers among them, carried their own
conventions and sometimes contradicted Roadie's.

## Decision

The Roadie Claude plugin is the skill source for every Oztix repo. Its skills
read each repo's own `AGENTS.md` and `CODING_STANDARDS.md`. Outside ideas are
adapted, not installed. Superpowers is retired (INNO-1099), and each other
generic skill is switched off once its Roadie replacement exists.

## Consequences

Agents get one set of conventions. We maintain the workflow skills ourselves.

## Links

- [`skills/README.md`](../../skills/README.md)
- INNO-1099
