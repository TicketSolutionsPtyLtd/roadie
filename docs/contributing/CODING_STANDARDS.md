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

- **Test at the public interface.** Assert behaviour, roles, and states, not
  class strings or internals. A test that asserts a CVA class name breaks on a
  refactor that changes nothing a user sees.
- **Public CVA props are inline literal unions**, never
  `VariantProps<…>['key']`, or the prop drops out of the docs' props table
  ([why](../solutions/build-errors/react-docgen-cva-literal-props.md)). Prefer
  `type X = Base & { … }` to `interface extends` for subcomponent props.
- **An unneeded comment is an Important finding.** Comment only what the code
  can't say, in one terse line.

## Docs

- **Pages are easy to scan.** Put the model first and each example before its
  explanation. Keep sections short, and use lists and tables only for content
  that is a list.
- **Sentences are plain.** One idea each, mechanisms and numbers rather than
  feelings. Use colons only before lists, and no bold-label-colon bullets.
- **Guidance stays generic.** The docs are public, so a rule never cites an
  internal app or its stack (Razor, C#) as its reason. Product names in Logo
  examples are fine.
