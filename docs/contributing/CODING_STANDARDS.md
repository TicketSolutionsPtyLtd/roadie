# Coding standards

Judgement calls a reviewer checks on every PR. Anything a lint rule, test or
CI job can catch belongs there instead, not here. `AGENTS.md` holds what an
implementer needs to write the code; `PR_WORKFLOW.md` holds the process.

## API design

- **Answer an app's ask for every app.** Name the missing concept first, then
  design the API around it and check it against sibling components'
  vocabulary. Prefer an opt-in prop to changing every instance's default.
- **Reuse CSS vocabulary for sizing and layout.** `1fr`, `minmax()`,
  `clamp()` and `min-content` beat an invented prop shape. Often the best API
  is no prop: a good default, overridden with `className`.

## Components

- **Every empty, no-results and error state uses `EmptyState`,** sized and
  worded by the Guidelines on its docs page, with `intent='danger'` on the
  root for errors.
- **Controls beside a search field match its size.**
- **Vue widget skins follow the same rules as React.** Roadie utilities and
  intents only: no scoped `<style>` blocks or hand-written CSS files.

## Code

- **Public CVA props are inline literal unions**, never
  `VariantProps<…>['key']`, or the prop drops out of the docs' props table
  ([why](../solutions/build-errors/react-docgen-cva-literal-props.md)). Prefer
  `type X = Base & { … }` to `interface extends` for subcomponent props.
- **An unneeded comment is an Important finding.** Comment only what the code
  can't say, in one terse line.

## Tests

Every test must be able to fail for a reason a user would notice.

- **Test at the public interface.** A component's props, roles, keyboard
  paths, and ARIA states; a pure function's inputs and outputs; a CSS
  utility's computed style. Renaming an internal never breaks a test.
- **Name the capability, and take expected values from the spec.** A test
  name says what someone can do. Expected values are literals or come from
  the spec, never recomputed with the code under test or the palette's own
  formula.
- **Don't restate the implementation.** Never assert that a CVA function's
  output contains a literal from its own map, that `X === X.Root`, or what a
  source or `.css` file says. Class assertions are fine only for Roadie's
  public utilities (`intent-*`, `emphasis-*`, `is-interactive*`).
- **What CSS decides is measured in a browser.** Sizes, `calc()`, container
  and media queries, transitions, and blur go in `*.browser.test.tsx`, using
  computed style or geometry. So does anything that needs
  `getBoundingClientRect`, `ResizeObserver`, or a root font size, rather
  than faking layout in jsdom.
- **Mock only system boundaries:** time (fake timers or a `today` or `now`
  input), randomness, the network, and browser APIs jsdom lacks. Never mock
  Base UI, motion, Roadie, or the repo's own modules; mock the network under
  them instead.
- **Wait for a state, not a time.** Use `waitFor`, `expect.poll`, or an
  animation's `finished`. A fixed sleep only proves something didn't happen,
  after a positive signal or with fake timers past the exact debounce.
- **Every public prop that changes behaviour has a test** through rendered
  output, including `locale`, `timeZone`, `weekStart`, and callbacks.
- **No unread snapshots.** Assert the part that matters instead.

## Docs

- **Pages are easy to scan.** Put the model first and each example before its
  explanation. Keep sections short, and use lists and tables only for content
  that is a list.
- **Sentences are plain.** One idea each, mechanisms and numbers rather than
  feelings. Use colons only before lists, and no bold-label-colon bullets.
  Skills follow the same rules.
- **Guidance stays generic.** The docs are public, so a rule never cites an
  internal app or its stack (Razor, C#) as its reason. Product names in Logo
  examples are fine.
