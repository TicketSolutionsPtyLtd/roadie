# @oztix/roadie-blocks

Designed page sections composed into pages, from code or any CMS. The
[docs](https://ticketsolutionsptyltd.github.io/roadie/blocks) are the guide
and the block catalogue.

```bash
pnpm add @oztix/roadie-blocks @oztix/roadie-components @oztix/roadie-core @phosphor-icons/react
```

```css
@import '@oztix/roadie-core/css';
@import '@oztix/roadie-components/css';
@import '@oztix/roadie-illustrations/css';
@import '@oztix/roadie-blocks/css';
```

Import each block from its own subpath, and wrap the site in
`BlocksProvider` from `/provider` to receive view and click events
and to draw images your way.

## Adding a block

Each block is a folder in `src/` with:

- `definition.ts`: `export const <block>Definition = { … } as const satisfies BlockDefinition`
  (name, title, description, and presets, at most two variants), with no React, added to
  `DEFINITIONS` in `src/catalogue/index.ts`. Export
  `type <Block>Preset = (typeof <block>Definition.presets)[number]['name']` and type the
  `preset` prop with it, so a renamed preset fails typecheck.
- `index.tsx`: the block, framed by `const block = useBlock(<block>Definition, props)` from
  `src/_shared/useBlock.ts`, which resolves the preset, alignment, and surface and hands
  back the props for `BlockRoot`, `BlockHeading`, and `BlockActions`, so the block renders
  only its own body. It takes `preset`, `position`, `id`, and plain data props.
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
  queries (`@3xl:`, `@5xl:`, `@7xl:`), never viewport breakpoints, except to override a
  wrapped component's own, such as `Carousel.Header`'s `md:`. A block in a Studio
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
- **One set of shared props.** Every block takes `intent`, `emphasis`, `contained`,
  `align`, `size`, and `actions` where they apply, with the same types from
  `src/_shared/surface.ts`, and passes them through. A preset sets the defaults in its
  definition's `defaults` (`align`, `emphasis`, `contained`, `itemEmphasis`, `ratio`); the
  props override them, so a new look is a preset, never a new prop.
- **The catalogue is the schema's source.** Each preset lists the props it reads in
  `fields` (and its items' in `itemFields`), typed against the block's props, with item
  counts in `limits`. Every preset lists `preset`. The fields inside an object field go
  in the definition's `shapes`, listed with `fieldsOf<Type>()`, which fails to type-check
  until every field of the type is listed; the catalogue adds
  images (`IMAGE_FIELDS`) and actions (`ACTION_FIELDS`) by field name. A CMS hides the rest and validates from it, so a prop a preset reads
  must be listed. Names are what a CMS stores: a block's `name` is its type, props are
  fields, and prop values are stored options, so renaming one after release needs a
  content migration.
  - `intent` goes to `BlockRoot` and `BlockHeading`, so marks, tints,
    highlights, and the strong action inherit it.
  - `emphasis` is a `BlockEmphasis` (`subtler`, `subtle`, `normal`, `raised`,
    `strong`, or `inverted`), the surface behind the block. On `strong` and
    `inverted`, `BlockSurface` gives the text the fill's own colour, and an
    item with an opaque surface of its own sets its intent again. Each must
    keep APCA contrast in both themes.
  - `itemEmphasis` is every item's surface at once (cards, questions), never
    per item, and an item may take its own `intent`.
  - `align` and `size` are the preset's alignment and scale; each step down
    from `lg` (`md`, then `sm`) sets the title a step smaller, with smaller
    descriptions and body text, tighter spacing, and a smaller share of the width
    for media. Size never changes colour or an image's shape.
  - An image slot's shape is a `BlockRatio` (`story` 9:16, `portrait` 3:4,
    `square`, `landscape` 3:2, `banner` 2:1) from `ratioClass`; video keeps 16:9. Where an editor picks it, the prop is
    `ratio`. Space a block's parts with
    `gapOf(size, step)`, and pick any other value with `bySize`, so no size falls
    through to another's.
  - An item's surface and mark follow `src/_shared/items.ts`: a linked item with no
    surface takes `subtler`, and a mark takes the item's intent, then the block's.
  - Hero opens the page and takes no surface.
- **Data names.** One image is `image` and many are `images`, wherever the
  preset puts them. Items use `title`, `description`, `image`, `illustration`,
  `href`, and `intent`.
- **Interaction follows links, never surfaces.** Card-like items build on Roadie's
  `Card`, or match its surfaces where its layout doesn't fit. An item with `href` gets a `Card.Link` on its title (`data-interactive-target`),
  so the whole card is the hit area and the click reports the title. A card carries
  `is-interactive-within`, as `Card` does; it does nothing without a target, so an item
  without `href` shows no hover or focus state. A linked card with no surface takes
  `subtler`, so its hover has somewhere to show. Sections, panels, and stats are never
  interactive.
- **The strong action stands out from a filled surface.** Pass `fill` to `BlockActions`
  on a `strong` or `inverted` panel, or over a photo scrim, and it picks an intent that
  stands out (`strongActionIntent`, tested against every intent in both modes).
- **One surface frame.** Every block draws its surface with `BlockSurface`,
  never its own markup. A band runs square across the window, and its content keeps
  the page's measure; with `contained`, it's a rounded panel in line with the hero
  (`FRAME_EDGE`).
- **Keys.** List keys use the item's index with its content, so repeated content stays
  distinct.
- **Room for an overhang.** A Call to action `photo` keeps a top margin for the photo that
  breaks out of its panel; like `statement`'s breathing room, it's part of the preset's look.
- **Preset types live in `definition.ts`,** derived from the definition, and the block's
  `index.tsx` re-exports them. Keep each `preset` prop's `@default` the definition's first preset.

### Thumbnails

A 240 by 160 SVG, with no text, drawn from rounded rectangles in these
colours. The one feature that makes the preset itself takes an action or mark
colour, and the rest stays grey. Each colour is set in a `style` attribute with
a fallback, so the wireframe follows the docs theme inline and reads in light
mode as an image:

| Use      | Style                                                                                                       |
| -------- | ----------------------------------------------------------------------------------------------------------- |
| Frame    | `fill: var(--color-neutral-1, #f5f8fb)`                                                                     |
| Surface  | `fill: var(--color-neutral-3, #e8eef4)`                                                                     |
| Image    | `fill: var(--color-neutral-5, #d7e2ed)`                                                                     |
| Text     | `fill: var(--color-neutral-7, #a9b8c7)`                                                                     |
| Headings | `fill: var(--color-neutral-11, #3b4b5b)`                                                                    |
| Actions  | `fill: var(--color-accent-9, #0191eb)`                                                                      |
| Marks    | `fill: var(--color-brand-9, #0191eb)`, `--color-info-9` (#a96af1), or `--color-brand-secondary-9` (#ff8a5c) |
