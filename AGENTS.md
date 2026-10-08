# Roadie agent instructions

Roadie is Oztix's design system: CSS tokens and utilities, React components,
charts, and a docs site, in a pnpm and Turborepo monorepo.

- **Making a change?** Follow [`PR_WORKFLOW.md`](docs/contributing/PR_WORKFLOW.md).
  Reviewers also check [`CODING_STANDARDS.md`](docs/contributing/CODING_STANDARDS.md).
- **Building with Roadie?** The [docs site](https://ticketsolutionsptyltd.github.io/roadie/)
  is the guide. Its source is `docs/src/app/`: start at
  `overview/getting-started`, then the page for the area you touch in
  `foundations/`, `components/`, or `charts/`.
- **Something behaving oddly?** Search `docs/solutions/` first. Each learning has
  `module`, `tags`, and `problem_type` frontmatter.

## Stack

- pnpm (`corepack enable`), Turborepo, React 19, TypeScript 5 in strict mode
  with no `any`, [Tailwind CSS v4](https://tailwindcss.com/docs) with
  `@utility` directives, and Next.js 16 with MDX for the docs.
- Interactive components wrap [Base UI](https://base-ui.com/). Steps is the one
  exception (`@ark-ui/react/steps`); build new components on Base UI.
- Icons are [Phosphor](https://phosphoricons.com/).

| Path                   | Package                                                          |
| ---------------------- | ---------------------------------------------------------------- |
| `packages/core/`       | `@oztix/roadie-core`: CSS, colour generator, records, dashboards |
| `packages/components/` | `@oztix/roadie-components`                                       |
| `packages/charts/`     | `@oztix/roadie-charts`: charts, legends, and dashboard views     |
| `packages/widgets/`    | `@oztix/roadie-widgets`: the cart drawer, React and Vue skins    |
| `docs/`                | The docs site                                                    |

Root scripts: `pnpm dev`, `build`, `test`, `test:browser`, `typecheck`, `lint`,
and `format`. Scope one with `--filter`:

```bash
pnpm --filter @oztix/roadie-components test
pnpm --filter docs dev
```

## Wiring something new

- Each package's public API is the `exports` block in its `package.json`.
  Docs and consumers import per-component subpaths, never the root barrel.
- A JS subpath needs a `tsdown.config.ts` entry unless a wildcard covers it.
- A CSS `@utility` must be named in its package's `src/css/safelist.html` (core
  and charts), or Tailwind purges it and the compiled sheet comes out empty.
- A utility in a family where one class replaces another (intent, emphasis,
  semantic colour, z-index, duration, easing, and text style) also goes in its
  group in `packages/core/src/utils/cn.ts`, or `cn()` keeps both classes and a
  consumer's class can't override the component's.
- `packages/core/src/css/roadie.css` imports every sheet in order, and each
  sheet's header says what it owns.

## Components

- One folder per component in `packages/components/src/components/`, with an
  `index.tsx` and a co-located test. Providers live in `src/providers/`.
- `Badge/index.tsx` is the reference for cva structure, variant names, and
  children inheriting colour from the root's emphasis.
- Read [`BASE_UI.md`](docs/contributing/BASE_UI.md) before wrapping Base UI
  and [`COMPOUND_PATTERNS.md`](docs/contributing/COMPOUND_PATTERNS.md) before a
  compound. The `new-component` skill covers both.
- Never set a default intent in `defaultVariants`; intent flows through the
  cascade.
- Drag and drop goes through `Sortable`.

## Styling

Each rule has a foundations page with the detail.

- **Colour.** Never hardcode a colour. Tailwind's palette is off, and `.dark`
  swaps the scales, so there are no `dark:` variants. Use the semantic
  utilities: `bg-{normal,subtler,subtle,strong,inverted,raised,sunken,mark}`,
  `text-{normal,subtle,subtler,strong,inverted,on-strong,mark}`,
  `border-{subtler,subtle,normal,strong,inverted}`, and `divide-subtler`. Colour that must stay the same
  in dark mode uses `--color-{scale}-light-{0|5|12|13}` (only neutral has step
  0).
- **Intent** only sets `--intent-*` variables, and children inherit them:
  `neutral` (the default, on `:root`), `brand`, `brand-secondary`, `accent`,
  `danger`, `success`, `warning`, and `info`.
- **Emphasis** presets set background, text, border, and states together:
  `strong` (solid fill), `normal` (visible border), `subtle` (tint, no border),
  `subtler` (barely tinted), `raised`, `sunken`, `field` (text fields, with
  `is-interactive-field`), `floating`, `inverted`, `overlay`, and
  `overlay-subtle`. Add `is-selected` to `emphasis-subtle` for the chosen item
  of a quiet, trackless control (its fill is under 3:1, so pair it with an
  icon), and `is-translucent` to raised or floating surfaces.
- **Interaction.** `is-interactive` on anything clickable;
  `is-interactive-field` and `is-interactive-field-group` on form controls;
  `is-interactive-within` on a surface whose main link sits inside it, marked
  `data-interactive-target`. Never hand-roll hover or focus states.
- **Layout.** `grid gap-*` by default, where the parent sizes its children;
  `flex` when children size themselves. Use `gap`, not margin, and set
  constraints, not fixed sizes.
- **Shape.** Named radius tiers only, `rounded-sm` to `rounded-7xl` and
  `rounded-full`, never `rounded-[…]`.
- **Icons.** Phosphor at `bold`, `Icon`-suffixed names, sized with `size-*`
  classes (`size-4` by default), and `/ssr` imports in server components. `fill`
  is only for selected states and `duotone` only above 48px; Navigator applies
  duotone to its destinations itself.
- **Text.** Raw `<p>` and `<h1>` to `<h6>` with `text-display-ui-*` or
  `text-display-prose-*`. There are no Text or Heading components; `Prose`
  renders CMS or markdown content. SpotIllustration colours are fixed.
- **Selectors.** End any selector that runs past a `:has()` on a class, a
  variable the anchor sets, or a rare attribute named first, and never write an
  unkeyed `:has(~ …)`, or Chromium restyles the whole page
  ([why](docs/solutions/best-practices/has-invalidation-scales-with-page.md)).

## Links and forms

- Every link-bearing component takes `href`. Internal hrefs route through the
  Link given to `RoadieProvider`, external ones open in a new tab, and no `href`
  on a button-shaped component renders a `<button>`.
- Never import `next/link` inside `packages/`. `render` is the escape hatch and
  wins over `href`. `List.Item`, `Menu.Item`, and the Navigator items are
  `href`-only.
- `Field` wraps every form control and owns `invalid`, `required`, and
  `disabled`. Use `Field.Label showIndicator`, `Field.ErrorText`,
  `Field.HelperText`, and `Select.Content`.

## Records, tables, and charts

Read the page before building: `foundations/records` for lists, views,
filters, and search; `foundations/tables` for records in a table;
`charts/data-visualisation` for any chart; `charts/dashboards` for dashboards.
These rules aren't on those pages.

- Each chart type has its own `@oztix/roadie-charts` subpath (`/line-chart` and
  so on), which is `'use client'` and exports only components. On a server, use
  `/static` (`renderChartSvg`) and `/tables`.
- A dashboard chart card's `plot` is `{ kind, ...props }`, where `kind` is
  `line`, `bar`, `ranked-bars`, `stacked-bars`, `histogram`, `funnel`,
  `heatmap`, `scatter`, or `small-multiples`.
- Chart colour by job: `--chart-1` to `-8` (categorical, at most 6 then
  "Other", or `--chart-pair-*` and `--chart-trio-*`), `--chart-heat-0` to `-8`,
  `--chart-diverge-neg-4` to `-pos-4`, `--chart-status-*` (meaning only),
  `--chart-highlight`, and `--chart-context`. Use `fill-chart-*`,
  `stroke-chart-*`, `bg-chart-*`, `chartColorVar(i)`, and, for canvas or PDF,
  `chartHex(mode, accentHue)`.
- Data hues never change; only `--chart-highlight` follows `--accent-hue`.
  `palette.ts` generates `dataviz.css`, so change the palette, then run
  `pnpm --filter @oztix/roadie-core test -u`.

## Tests and code

- Vitest and Testing Library, with tests next to the code they cover.
- Anything CSS decides goes in a `*.browser.test.tsx`, which runs in Chromium,
  WebKit, and Firefox. jsdom can't evaluate `calc()` or container queries, so
  don't assert rule text there.
- Iterate on one file with `pnpm test:gated <package> <file>` (a package or
  repo path; load-gated, Chromium only), never `vitest` or the whole suite
  directly.
- Dev-only warnings check `process.env.NODE_ENV` behind a
  `typeof process !== 'undefined'` guard
  ([why](docs/solutions/build-errors/cross-bundler-dev-env-check.md)).

## Docs pages

Component pages follow
[`COMPONENT_DOC_TEMPLATE.md`](docs/contributing/COMPONENT_DOC_TEMPLATE.md), and
writing follows the content rules in
[`PR_WORKFLOW.md`](docs/contributing/PR_WORKFLOW.md) section 3.
