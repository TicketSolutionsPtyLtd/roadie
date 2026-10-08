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
  no boundary is agreed, propose one before writing a test.

## 2. Pick the boundary and the test type

Choose the cheapest test that can fail ("Tests" in `CODING_STANDARDS.md`). A
browser test is only for what CSS decides.

| Behaviour                                                            | Boundary                            | Test                                                             |
| -------------------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------- |
| A component                                                          | props, roles, keyboard, ARIA states | jsdom, Testing Library, `userEvent`                              |
| Pure logic (records queries, `validateDashboard`, chart definitions) | inputs and outputs                  | table-driven unit test (`it.each`)                               |
| Anything CSS decides                                                 | computed style or geometry          | `*.browser.test.tsx` in Chromium, WebKit, and Firefox            |
| Touch                                                                | the same, with hover off            | browser test with `setHoverCapable(false)`                       |
| Appearance                                                           | pixels                              | the visual and accessibility checks (INNO-1132), not a unit test |
| A journey across pages                                               | the running app                     | the repo's e2e suite, for critical paths only                    |

Query by role, then label, then text, and by test id only as a last resort.
Each test sets up its own state and passes alone.

## 3. The loop

1. Write **one** test for one behaviour, named for what a user can do. Start
   with one path end to end.
2. Run that file and watch it fail on the assertion, not on an import or a
   typo.
3. Write just enough code to pass it.
4. Repeat for the next behaviour. Never write the tests up front in a batch.
   Leave refactoring to review.

Testing code that already exists? Still one test at a time: write it, break
the behaviour (drop the prop's effect), watch it fail, then restore it.

Iterate on the file you're writing, through the repo's load-gated runner,
never `vitest` or the whole suite directly. In Roadie that's
`pnpm test:gated <package> <file>`, which waits for load and runs Chromium
only; add `--project 'browser*'` for a browser test. A repo without a runner
follows its own load rule and runs `vitest run <file>`. Before pushing,
follow the host workflow (in Roadie, touched browser files once in all three
engines), and let the hooks and CI run the rest.

## 4. Tests that lie

Real Roadie examples from the INNO-1130 audit (October 2026):

| Anti-pattern                                       | Example                                                                              | Instead                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| CVA class strings standing in for behaviour        | `Switch.test.tsx:127`: `expect(switchVariants({ size: 'sm' })).toContain('h-5')`     | Render it; measure the height in a browser test if size matters    |
| A `calc()` asserted as text in jsdom               | `Pane.test.tsx:926`: `toHaveClass('min-h-[calc(--spacing(4)_+_…)]')`                 | Measure the header's height in a browser                           |
| Reading CSS or source text                         | `navigatorPending.test.ts:3`: imports the sheet `?raw` and asserts `animation: none` | Emulate reduced motion in a browser and read computed style        |
| An alias that can't fail                           | `Card.test.tsx:20`: `expect(Card).toBe(Card.Root)`                                   | Delete it; a render of `<Card.Root>` covers it                     |
| Recomputing the expected value                     | calling the palette's own formula to get the expected token                          | A literal from the spec                                            |
| Mocking Base UI, motion, or the repo's own modules | `NumberField.test.tsx:11`: `vi.mock('@number-flow/react', …)`                        | Render the real thing; test in a browser if jsdom can't            |
| Faked layout in jsdom                              | `RecordTable.narrow.test.tsx:51`: stubs `getBoundingClientRect` and a 16px root      | A browser test at a real width                                     |
| A fixed sleep                                      | `RecordsSearch.test.tsx:565`: sleeps 150ms, then asserts no chips                    | Fake timers past the debounce, or wait for a positive signal first |
| An unread snapshot                                 | `toMatchSnapshot()` on a whole tree                                                  | Assert the part that matters                                       |

Mock only time (fake timers or a `today` or `now` input), randomness, the
network, and browser APIs jsdom lacks.

## 5. Before you hand off

For each new test, answer yes to all three, or rewrite it:

- Would it fail if the behaviour were deleted?
- Would it still pass if an internal were renamed?
- Does its name say what a user can do?

Then report the files, what each test proves, and the run you made.
`/roadie:review` checks the same rules.
