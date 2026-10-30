# @oztix/roadie-marketing-blocks

Designed page sections that marketing composes into pages, from any CMS. The
[docs](https://ticketsolutionsptyltd.github.io/roadie/blocks) are the guide
and the block catalogue.

```bash
pnpm add @oztix/roadie-marketing-blocks @oztix/roadie-components @oztix/roadie-core
```

```css
@import '@oztix/roadie-core/css';
@import '@oztix/roadie-components/css';
@import '@oztix/roadie-marketing-blocks/css';
```

Import each block from its own subpath, and wrap the site in
`MarketingBlocksProvider` from `/provider` to receive view and click events
and to draw images your way.

## Adding a block

Each block is a folder in `src/` with:

- `definition.ts`: `export const <block>Definition = { … } as const satisfies BlockDefinition`
  (name, title, description, and presets, at most two variants), with no React, added to
  `DEFINITIONS` in `src/catalogue/index.ts`. Export
  `type <Block>Preset = (typeof <block>Definition.presets)[number]['name']` and type the
  `preset` prop with it, so a renamed preset fails typecheck.
- `index.tsx`: the block, rendered in `BlockRoot` from `src/_shared/`, reading its preset
  with `const { name, variant } = presetOf(<block>Definition, preset)`, and taking `preset`,
  `position`, `id`, and plain data props
- a co-located test, and a `*.browser.test.tsx` for layout and axe, using the helpers in
  `src/_test/browser.ts`. Shared test data goes in `fixtures.ts`. Neither ships.
- a wireframe per preset in `src/thumbnails/<block>-<preset>.svg`
- a docs page at `docs/src/app/blocks/<block>/page.mdx`

Run `pnpm generate:exports` after adding the folder.

### Rules every block follows

- **Breakpoints for the content.** Pick each container breakpoint for the block's own
  content, never by translating the site's viewport ones: a block's container is
  narrower than the screen by the page padding, so `md` is not `@3xl`. Text beside an
  image goes side by side from about `@xl` (36rem); a grid adds a column for roughly
  every 18rem of card. Test the switch in a browser test at a mid width, such as 640px.
- **Its own width, not the screen's.** `BlockRoot` is a container, so layout uses container
  queries (`@3xl:`, `@5xl:`, `@7xl:`), never viewport breakpoints. A block in a Studio
  preview pane or a narrow column lays out as it would on a phone.
- **No outer vertical padding.** The page spaces blocks with its gap. A block pads only
  inside a surface it draws, such as a raised panel. The one exception is RichText's
  `statement`, whose generous space above and below is its look.
- **Shared names.** Illustrations take `SpotIllustrationName` from `src/_shared/illustrations.ts`
  (re-exported from `/provider`), headings go through `BlockHeading` (its `size` sets a
  preset's title step), and images through `BlockImg` with the `sizes` the layout needs.
- **Prop shapes.** Array props are `readonly`, `actions` is optional, `preset` has a
  `@default`, and `position` and `id` keep the wording: "The block's place on the page,
  counting from 1, reported with its events." and "An id for linking to the block."
- **Intent on every block, emphasis where it draws a surface.** Every block takes
  `intent?: BlockIntent` and passes it to `BlockRoot` and `BlockHeading`, so marks,
  tints, highlights, and the strong action inherit it. A block that draws a band or
  panel takes `emphasis?` from a curated union of `BlockEmphasis`: only the presets its
  content stays readable on in both themes, checked with APCA. A preset sets the
  default intent and emphasis; the props override it. A grid of cards takes
  `cardEmphasis?` for every card at once, never per card, and an item may take its own
  `intent`. Never an emphasis option that hides content or breaks contrast.
- **Interaction follows links, never surfaces.** Card-like items build on Roadie's
  `Card`. An item with `href` gets a `Card.Link` on its title (`data-interactive-target`)
  and `is-interactive-within` on the card, so the whole card is the hit area and the
  click reports the title. An item without `href` gets no hover or focus state. A linked
  card with no surface takes `subtler`, so its hover has somewhere to show. Sections,
  panels, and stats are never interactive.
- **Keys.** List keys use the item's index with its content, so repeated content stays
  distinct.
- **Room for an overhang.** CTA band's `with-photo` keeps a top margin for the photo that
  breaks out of its panel; like `statement`'s breathing room, it's part of the preset's look.
- **Preset types live in `definition.ts`,** derived from the definition, and the block's
  `index.tsx` re-exports them. Keep each `preset` prop's `@default` the definition's first preset.

### Thumbnails

A 240 by 160 SVG, with no text, drawn from rounded rectangles in these
colours, each set in a `style` attribute with a fallback so the wireframe
follows the docs theme inline and reads in light mode as an image:

| Use      | Style                                    |
| -------- | ---------------------------------------- |
| Frame    | `fill: var(--color-neutral-1, #f5f8fb)`  |
| Surface  | `fill: var(--color-neutral-3, #e8eef4)`  |
| Image    | `fill: var(--color-neutral-5, #d7e2ed)`  |
| Text     | `fill: var(--color-neutral-7, #a9b8c7)`  |
| Headings | `fill: var(--color-neutral-11, #3b4b5b)` |
| Actions  | `fill: var(--color-accent-9, #0191eb)`   |
