---
name: test
description: Use when writing or changing tests in any Oztix repo, or building a behaviour test-first. Picks the boundary and test type, runs one failing test at a time, and avoids tests that can't fail. Reads the host repo's AGENTS.md and CODING_STANDARDS.md. Triggers on "write tests for", "add a test", "test-first", "TDD", "cover this prop", "why can't this test fail".
---

# Roadie test

Build concrete behaviour test-first, through the public interface, with tests
that fail when the behaviour breaks. Adapted from Matt Pocock's `tdd` skill
(MIT).

Use it for behaviour only. Skip config, wiring, re-exports, and types, which lint
and typecheck cover.

## 1. Read the rules

- The host repo's `AGENTS.md` (or `CLAUDE.md`) and `CODING_STANDARDS.md`
  (`git ls-files | grep -iE 'agents.md|coding_standards'`). Their test rules
  win over anything here.
- No test rules there? Use Roadie's "Tests" section:
  `https://raw.githubusercontent.com/TicketSolutionsPtyLtd/roadie/main/docs/contributing/CODING_STANDARDS.md`.
- The spec, ticket, or PR body: which behaviours, and at which boundary. If
  no boundary is agreed, propose one before writing a test. If a behaviour
  can't be reached through the public interface, stop and run
  `/roadie:codebase-design` rather than test an internal.

## 2. Pick the boundary and the test type

Choose the cheapest test that can fail ("Tests" in `CODING_STANDARDS.md`). A
browser test is only for what CSS or the browser itself decides.

| Behaviour                                                            | Boundary                            | Test                                                  |
| -------------------------------------------------------------------- | ----------------------------------- | ----------------------------------------------------- |
| A component                                                          | props, roles, keyboard, ARIA states | jsdom, Testing Library, `userEvent`                   |
| Pure logic (records queries, `validateDashboard`, chart definitions) | inputs and outputs                  | table-driven unit test (`it.each`)                    |
| Anything CSS decides, or real pointer input such as drag and drop    | computed style or geometry          | `*.browser.test.tsx` in Chromium, WebKit, and Firefox |
| Touch                                                                | the same, with hover off            | browser test with `setHoverCapable(false)`            |
| Appearance                                                           | pixels                              | the visual and accessibility checks, not a unit test  |
| A journey across pages                                               | the running app                     | the repo's e2e suite, for critical paths only         |

## 3. The loop

1. Write **one** test for one behaviour, named for what a user can do. Start
   with one path end to end. Several `it.each` rows for one behaviour count
   as one test.
2. Run that file and watch it fail on the assertion, not on an import or a
   typo.
3. Write just enough code to pass it.
4. Repeat for the next behaviour. Never write the tests up front in a batch.
   Leave refactoring to `/roadie:review`.

Testing code that already exists? Still one test at a time: write it, break
the behaviour, watch it fail, then restore it. A prop can act in more than
one place (a picker's `weekStart` sets the calendar and reads "end of week"),
and a rule can have several conditions, so break each one.

Iterate on the file you're writing, through the repo's load-gated runner,
never `vitest` or the whole suite directly. In Roadie that's
`pnpm test:gated <package> <file>`, where `<package>` is the folder name (such
as `components`, not the npm name) and the path, relative to the package or
the repo, is a file or folder; a missing path exits 2, and one no test covers
exits 1. It waits for load and runs Chromium only; add `--all-browsers` for
WebKit and Firefox too. A repo without a runner follows its own load rule and
runs `vitest run <file>`. Before pushing, follow
the host workflow and let the hooks and CI run the rest. In Roadie, the run
`gh pr ready` starts is Chromium only, and WebKit and Firefox run on `main`
and nightly, so a browser test that covers CSS or an engine difference wants
the `full-browsers` label on the PR (PR workflow sections 5 and 7).

## 4. Tests that lie

Patterns the INNO-1130 audit found in Roadie (October 2026), since fixed.
Roadie's lint rules now fail the first five. They ship in the `testing`
preset of `@oztix/roadie-lint-plugin`, so apps can turn them on.

| Anti-pattern                                              | Lint rule                        | Instead                                                            |
| --------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------ |
| CVA class strings standing in for behaviour               | `roadie/no-cva-output-assertion` | Render it; measure the height in a browser test if size matters    |
| A `calc()`, container query, or breakpoint class in jsdom | `roadie/no-css-class-in-jsdom`   | Measure it in a browser                                            |
| Reading CSS source (`?raw` or `readFileSync`)             | `roadie/no-css-source-in-jsdom`  | Emulate the condition in a browser and read computed style         |
| Faked layout in jsdom (`getBoundingClientRect`)           | `roadie/no-layout-fake-in-jsdom` | A browser test at a real width                                     |
| A fixed sleep                                             | `roadie/no-fixed-sleep`          | Fake timers past the debounce, or wait for a positive signal first |
| Recomputing the expected value                            | None                             | A literal from the spec                                            |
| Mocking Base UI, motion, or the repo's own modules        | None                             | Render the real thing; test in a browser if jsdom can't            |
| An unread snapshot                                        | None                             | Assert the part that matters                                       |

## 5. Engine quirks in browser tests

A browser test that passes in Chromium can fail in WebKit or Firefox for a
reason in the engine, not the code. Search the repo's learnings
(`docs/solutions/test-failures/` in Roadie) before you debug one. Roadie has
helpers for the common ones:

- **WebKit ignores a hover.** Base UI drops WebKit's pointer moves that don't
  move, which is all Playwright sends. Use `pointAt(element)` from
  `packages/components/src/utils/pointerTestUtils.ts`, not
  `userEvent.hover`.
- **Firefox stops firing focus events** in a window that isn't focused, which
  files run one after another can leave it in. Call
  `await commands.focusPage()` (a browser command in
  `packages/components/vitest.config.ts`), then
  `await expect.poll(() => document.hasFocus()).toBe(true)` before the first
  key.
- **Headless WebKit on Linux runs no frames while idle**, so
  `requestAnimationFrame`, `ResizeObserver`, and animations stall. Wrap the
  wait in `withFrames` from `packages/components/src/css/testUtils.ts`.
- **Touch.** `setHoverCapable(false)` from the same file turns hover off,
  and `tapOn` from `packages/components/src/utils/touchTestUtils.ts` sends a
  real tap.

## 6. Before you hand off

For each new test, answer yes to all three, or rewrite it:

- Would it fail if the behaviour were deleted?
- Would it still pass if an internal were renamed?
- Does its name say what a user can do?

Format with the repo's own formatter config. Where it has none, don't run
Prettier with defaults; match the file's existing style.

Then report the files, what each test proves, and the run you made.
`/roadie:review` checks the same rules.
