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
- **Contrast is APCA,** never a WCAG 2 ratio, at the thresholds on the
  [colours page](https://ticketsolutionsptyltd.github.io/roadie/foundations/colors#contrast).
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
  utility's computed style. Query by role, then label, then text, and by
  test id only as a last resort. Renaming an internal never breaks a test.
  A behaviour you can only reach through an internal, a test-only export, or
  a stub means the module is too shallow. Deepen it
  ([`/roadie:codebase-design`](../../skills/codebase-design/SKILL.md)) rather
  than test past its interface.
- **Each test sets up its own state and passes alone.**
- **Name the capability, and take expected values from the spec.** A test
  name says what someone can do. Expected values are literals or come from
  the spec, never recomputed with the code under test or the palette's own
  formula.
- **Don't restate the implementation.** Never assert that a CVA function's
  output contains a literal from its own map, or what a source or `.css` file
  says. Class assertions are fine only for Roadie's public utilities
  (`intent-*`, `emphasis-*`, `is-interactive*`). `Compound === Compound.Root`
  stays: `COMPOUND_PATTERNS.md` promises the same reference.
- **Choose the cheapest test that can fail.** Pure logic gets a unit test,
  and behaviour that doesn't depend on layout stays in jsdom. A browser test
  is only for what CSS or the browser itself decides: computed spacing and
  size, measure, `calc()`, container and media queries, `:has()`, touch
  versus hover, transitions, engine differences, and real pointer input such
  as drag and drop.
- **What CSS decides is measured in a real browser.** Use computed style or
  geometry in `*.browser.test.tsx`. Anything that needs
  `getBoundingClientRect`, `ResizeObserver`, or a root font size goes there
  too, rather than faking layout in jsdom. Never use a browser that doesn't
  render (Lightpanda and the like), where a layout test passes without
  checking anything.
- **Mock only system boundaries:** time (fake timers or a `today` or `now`
  input), randomness, the network, and browser APIs jsdom lacks. Never mock
  Base UI, motion, Roadie, or the repo's own modules; mock the network under
  them instead.
- **Wait for a state, not a time.** Use `waitFor`, `expect.poll`, or an
  animation's `finished`. To prove something didn't happen, wait for a
  positive signal first or advance fake timers past the exact debounce,
  never a fixed sleep.
- **Every public prop that changes behaviour has a test** through rendered
  output, including `locale`, `timeZone`, `weekStart`, and callbacks.
- **No unread snapshots.** Assert the part that matters instead.

## Docs

- **Pages follow their template.** [DOCS_PAGES.md](DOCS_PAGES.md) names the
  template for each page type. Layout in top-level MDX comes from docs
  components, not `className`.
- **Pages are easy to scan.** Put the model first and each example before its
  explanation. Keep sections short, and use lists and tables only for content
  that is a list.
- **Sentences are plain.** One idea each, mechanisms and numbers rather than
  feelings. Use colons only before lists, and no bold-label-colon bullets.
  Skills follow the same rules.
- **Guidance stays generic.** The docs are public, so a rule never cites an
  internal app or its stack (Razor, C#) as its reason. Product names in Logo
  examples are fine.
