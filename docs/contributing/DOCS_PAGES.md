# Docs pages

Conventions for every page in `docs/src/app/`. Each page type has a template
with its skeleton and the rules on top of these.

| Page type                          | Template                                                   |
| ---------------------------------- | ---------------------------------------------------------- |
| Component and chart                | [`COMPONENT_DOC_TEMPLATE.md`](COMPONENT_DOC_TEMPLATE.md)   |
| Foundation                         | [`FOUNDATION_DOC_TEMPLATE.md`](FOUNDATION_DOC_TEMPLATE.md) |
| Brand                              | [`BRAND_DOC_TEMPLATE.md`](BRAND_DOC_TEMPLATE.md)           |
| Content (voice, tone, and grammar) | [`CONTENT_DOC_TEMPLATE.md`](CONTENT_DOC_TEMPLATE.md)       |
| Overview guides and widgets        | None, just these conventions                               |

## MDX by default

- A docs page is `page.mdx`
  ([decision 0007](../decisions/0007-mdx-by-default.md)). Write prose in
  markdown, and add a component inline only where it adds something: a
  `tsx-live` example, `Guideline`, `PropsDefinitions`, or a token table.
- MDX pages share one prose stylesheet and these conventions, and only they
  get a markdown copy for agents (`docs/scripts/llms.ts` reads `page.mdx`).
- `page.tsx` is only for app-like pages: the home page, the catalogue indexes
  (`/components`, `/foundations`, `/charts`, and `/tokens`), `/appearance`, the
  token explorer pages under `/tokens/`, the reference dashboards
  (`/charts/audience-dashboard`, `/charts/portfolio-dashboard`, and
  `/charts/show-dashboard`), `/examples/`, `/debug/`, and redirects.
- The foundations pages other than Accessibility, Colors, Date and time,
  Elevation, Forms, Iconography, Interactions, Layout, Linking, Performance,
  Prose, Records, Shape, Tables, Theming, Typography, and View transitions,
  `/charts/dashboards`, and `/charts/data-visualisation` are content pages
  still in `page.tsx`. They move to MDX (INNO-1159); never add another.

## Metadata

- `export const metadata = { title, description }` opens the file. The layout
  renders `title` as the page's `h1`, so the body has no `#` heading.
- `description` is one sentence, shown on catalogue cards.
- A catalogue page adds `category`, one of its catalogue's categories in
  `docs/src/lib/page-manifest.ts`. `order`, `hidden`, `alsoIn`, and `wide`
  are optional, and component and widget pages add `status`.

## Prose and live examples

- MDX renders inside `.prose` (the `wrapper` in `docs/mdx-components.tsx`), so
  headings, lists, tables, code, and links need no classes. Markdown tables
  scroll sideways on narrow screens by themselves.
- `tsx-live` is the default for a live example. The whole example escapes
  `.prose` and renders as it would in an app.
- `tsx-live-prose` is only for an example that demos `.prose` or `Prose`.
  Only its toolbar and code escape, so the preview is typeset.
- `data-not-prose` belongs on the chrome of a docs component that sets its own
  type, such as the `Guideline` heading. Page MDX never needs it, because
  fences escape by themselves; inside a `tsx-live-prose` example it's what the
  demo teaches.
- A plain `tsx` fence is for code that doesn't run, such as imports and setup.
- Fences get every component without imports. Top-level JSX, such as a
  `Guideline` example, imports what it uses from a per-component subpath.
- Fence options (`id=`, `eager`, `-noinline`, `-expand`, and the layout
  options `layout=`, `gap=`, and `width=`) are in
  [`COMPONENT_DOC_TEMPLATE.md`](COMPONENT_DOC_TEMPLATE.md#live-examples).

## Layout

- No `className` layout in top-level MDX: no `grid gap-*` wrappers, width
  frames, or spacing. Use the docs components instead: `Guidelines`,
  `Guideline` with `width`, and `Guideline.Row`. A layout they can't express
  becomes a new docs component in `docs/src/components/`, not a `div`.
- Text style classes such as `text-display-ui-*` and `text-subtle` are fine,
  though markdown usually says it better.
- `roadie/no-mdx-layout-class` rejects `className` layout on top-level JSX
  in `.mdx`.
- Code inside a fence is what readers copy, so it stays plain Roadie and
  Tailwind, with only the component. Preview scaffolding, such as stacks,
  wrapping rows, width frames, and state labels, comes from the layout
  options and caption comments in rules 12 and 13 of the component template
  ([decision 0011](../decisions/0011-fence-layout-options.md)).
- Asset URLs in fences are plain, such as `'/roadie-logo.png'`. The preview
  adds the base path the docs deploy under, so fences never call a docs-only
  helper.

## Data-driven parts

- Values that live in `@oztix/roadie-core`, such as scales, swatches, and
  shadows, come from a small docs component that renders the tokens
  themselves, never a hand-typed table that drifts. Examples are
  `dataviz/DatavizSwatches` and the grids in `tokens/FamilyVisuals`. Put a
  new one in a folder for its area in `docs/src/components/`.
- Guidance a person writes, such as which tier to use where, is a table.
- A docs component with no children drops out of the markdown copy, so the
  sentence before it says what it shows without pointing "below" at it.
- Every value of a family is on its `/tokens/` page. A foundation page links
  there through `guidance` in `docs/src/lib/token-families.ts`, and the
  layout shows the link under the title.

## Editing

- Edit `.mdx` by hand and never run Prettier on it. It rewrites the code in
  fences, so `.prettierignore` skips `docs/**/*.mdx`. Formatting `.md` is fine.
- `pnpm --filter docs lint` checks the MDX and its live fences, which get the
  `roadie/*` package rules. `roadie/no-mdx-layout-class` skips every fence.
- `roadie/no-fence-layout-wrapper` fails a fence whose root is a layout `div`
  the layout options can replace. It covers the pages listed in
  `docs/eslint.config.js`, and each migration batch adds its pages.
- A skeleton here with nested fences sits in a four-backtick ` ````mdx `
  fence, which keeps them intact when the `.md` is formatted.

## Writing

Follow the content rules in
[`PR_WORKFLOW.md`](PR_WORKFLOW.md#3-roadie-conventions-and-foundations-blocking)
section 3 and the Docs rules in
[`CODING_STANDARDS.md`](CODING_STANDARDS.md#docs): sentence case, Australian
spelling, the Oxford comma, no em or en dashes, no colons in headings, and
names from [`EXAMPLE_DATA.md`](EXAMPLE_DATA.md).
