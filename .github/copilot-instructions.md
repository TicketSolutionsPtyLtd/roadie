# Roadie review instructions

Roadie is Oztix's design system: a pnpm/Turborepo monorepo with CSS tokens
and utilities (`packages/core`), React components on Base UI
(`packages/components`), charts (`packages/charts`) and a Next.js docs site
(`docs`). `AGENTS.md` is the full rulebook; `docs/contributing/PR_WORKFLOW.md`
is the process.

## Review priorities

1. Real bugs a user would hit: wrong value committed, lost focus, broken
   keyboard or screen reader behaviour, controlled vs uncontrolled props and
   defaults, async races, SSR/hydration mismatches, time zones and DST.
2. Behaviour changes for consumers that the changeset doesn't mention.
3. Tests that pass without testing anything, or that depend on timing.
4. Roadie conventions below.

Give a concrete failing input for each finding. Skip style nits Prettier or
ESLint already enforce.

## Conventions to enforce

- Colours only through Roadie utilities and intents (`bg-subtle`,
  `text-strong`, `intent-accent`, `emphasis-*`). No Tailwind palette colours,
  hex or `rgb()`, no `dark:` variants. Exception: SpotIllustration source
  SVGs keep exact hex fills for the conversion script (see its README).
- Layout: `grid gap-*` for stacks, `flex` only when children size
  themselves, `gap` not margin between siblings.
- Interactive elements use `is-interactive` (fields `is-interactive-field`);
  no hand-rolled hover/focus states.
- Icons: Phosphor, `Icon`-suffixed names, `bold` weight, sized with
  Tailwind `size-*` classes, never the `size` prop.
- Text uses raw `<p>`/`<h1>`–`<h6>` with `text-display-*` classes; no Text
  or Heading components.
- Links: components take `href` and route through `RoadieLinkProvider`;
  never import `next/link` inside packages.
- Forms: `Field` wraps every control and owns invalid/required/disabled.
- CSS after a `:has()` must end on a class, a variable or a rare attribute
  (styling rule 8); a guard test enforces it.
- Public CVA props are typed as inline literal unions, not
  `VariantProps<…>['x']`. Booleans are bare adjectives (`disabled`,
  `combined`), never `is*`.
- Dev-only warnings check `process.env.NODE_ENV` with a
  `typeof process !== 'undefined'` guard, not `import.meta.env`.
- Comments explain why, never what.
- Docs: sentence case, Australian spelling, no em dashes, invented venues
  and events; `.mdx` is edited by hand.
- New public subpaths are wired into `package.json` exports, the build
  config and the package's Size Limit budget.

## Deliberate decisions (don't flag)

- Client components import Phosphor from `@phosphor-icons/react/ssr` on
  purpose, across the package.
- Contrast exceptions are allowed only where a test comment and the docs
  record them (for example Kbd `subtle` keycaps at Lc 50 on strong success,
  warning, danger and brand-secondary fills, and Lc 55 in muted text).
- Unreleased APIs change by editing their existing changeset, not by adding
  a "breaking" one.
- Plans and specs live in the PR description, not committed files; don't ask
  for a plan document.
- `pnpm-workspace.yaml` `audit.ignore` entries carry their reason inline;
  only flag one whose reason no longer holds.
- `resolveComparison`'s previous period follows the calendar for calendar
  periods (this month against last month, month to date against last month
  to the same day), not the same number of days before (INNO-1039).
