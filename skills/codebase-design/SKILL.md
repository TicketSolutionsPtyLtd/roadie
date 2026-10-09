---
name: codebase-design
description: Use when an area is hard to test, tests keep reaching past the public interface, one concept is spread across many files, or before designing a new module, compound, or engine, in any Oztix repo. Finds deepening opportunities (a small interface hiding more behaviour) with one vocabulary (module, interface, depth, seam, locality, and leverage) and proposes them ranked, without changing code. Reads the host repo's AGENTS.md and CODING_STANDARDS.md. Triggers on "improve the architecture", "deepening opportunities", "why is this hard to test", "design this module", "shallow module", "codebase design".
---

# Roadie codebase design

Tests that reach past the interface are a design problem, not a test problem.
A deep module (a small interface hiding a lot of behaviour) can only be tested
through its interface, so its tests survive refactors. This skill finds where
an area is shallow and proposes how to deepen it. Adapted from Matt Pocock's
`codebase-design` and `improve-codebase-architecture` skills (MIT).

It proposes; it doesn't refactor. A chosen proposal goes to `/roadie:grill`
(for a new public API) or `/roadie:spec`, and its tests to `/roadie:test`.

## 1. Read the rules

- The host repo's `AGENTS.md` (or `CLAUDE.md`) and `CODING_STANDARDS.md`
  (`git ls-files | grep -iE 'agents.md|claude.md|coding_standards'`),
  especially "Test at the public interface" and the mocking rule. They win
  over anything here. With none, use Roadie's
  `https://raw.githubusercontent.com/TicketSolutionsPtyLtd/roadie/main/docs/contributing/CODING_STANDARDS.md`.
- The decision register (`docs/decisions/` or wherever `AGENTS.md` points)
  and recorded learnings (`docs/solutions/`) for the area. Flag a proposal
  that reopens a decision, and only when the friction justifies it.
- The area's docs page or foundations page, which is its promised interface.

## 2. Vocabulary

Use these words, and only these, for structure.

| Term          | Meaning                                                                                                                                                                                                                                                                                                          |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Module**    | Anything with an interface and an implementation: a component, a compound, a hook, a pure engine, or a CSS utility family.                                                                                                                                                                                       |
| **Interface** | Everything a caller must know, not just the type signature. A component's is its public props, DOM behaviour, accessibility roles and states, and the public utilities (`intent-*`, `emphasis-*`, `is-interactive*`). An engine's, like Records, is its pure functions' inputs, outputs, invariants, and errors. |
| **Depth**     | How much behaviour sits behind how little interface. Shallow means the interface is nearly as big as what it hides.                                                                                                                                                                                              |
| **Seam**      | A place where behaviour can vary without editing the caller. Real only with two adapters (production and test); one adapter is hypothetical.                                                                                                                                                                     |
| **Locality**  | How much of one change happens in one place. Low locality means a change edits several files that must agree.                                                                                                                                                                                                    |
| **Leverage**  | How many callers one module serves. A module used by two layouts through deep imports has leverage but no interface.                                                                                                                                                                                             |

## 3. Principles

- **The interface is the test surface.** If a behaviour can only be checked
  by importing an internal, stubbing layout, or mocking the repo's own
  module, the module is too shallow for that behaviour.
- **The deletion test.** Imagine deleting the module. If its complexity
  vanishes, it was a pass-through; merge it. If the complexity reappears in
  every caller, it earns its keep.
- **Seams sit at system boundaries.** Time, randomness, the network, and
  browser APIs (CODING_STANDARDS "Mock only system boundaries"). Don't add a
  seam, prop, or export only so a test can reach in.
- **Pure in-process logic merges freely.** Pull it out of hooks and
  components into one pure module, test it table-driven, and keep the DOM
  reads in a thin layer measured in a browser.
- **Replace, don't layer.** Once tests sit at the deepened interface, delete
  the tests of the shallow parts it absorbed.
- **A public interface change is a one-way door.** Renaming or removing a
  prop, export, or subpath needs the maintainer. Prefer deepening behind the
  current public interface.

## 4. Explore

1. **Scope** to one area: the one named, or a hot spot from
   `git log --since=1.month --name-only` or a test audit.
2. **Look for friction**, citing file and line:
   - Tests that reach past the interface: imports from non-public files,
     test-only exports, class strings or CVA output, stubbed
     `getBoundingClientRect` or `ResizeObserver`, `vi.mock` of the repo's own
     modules, expected values read from the code's own constants.
   - One concept spread across files that must agree (a size in a JS
     constant and a Tailwind class, a comment saying "matches the above").
   - Deep imports from a sibling's internals, which show an unnamed module.
   - Pure maths buried in hooks or components, so only a rendered test or a
     browser can reach it.
   - Pass-through modules that fail the deletion test.
3. **Classify each dependency** of a candidate: in-process (merge it),
   browser API (keep a thin layer, test in a browser), or network (seam with
   a test adapter).

## 5. Propose

Report in the session, or in the PR or ticket that asked. For each candidate:

- The files involved.
- The problem, in the vocabulary above.
- The deepened module: what it hides, and roughly what its interface takes
  and returns. Don't settle the exact shape yet.
- The tests that become possible at the interface, and the ones it deletes.
- The door: two-way, or one-way with the public item it changes.
- The strength: Strong, Worth exploring, or Speculative.

Also list what's already deep and should stay, so nobody "fixes" it. End with
a top recommendation and ask which candidate to pursue. For the chosen one,
sketch two different interfaces and compare them before handing it on.
