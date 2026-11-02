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
  definition's `defaults` (`align`, `emphasis`, `contained`); the props override them, so a
  new look is a preset, never a new prop. A default the content decides, such as CTABand
  starting beside its photo, goes to `useBlock` as a fallback.
  - `intent` goes to `BlockRoot` and `BlockHeading`, so marks, tints,
    highlights, and the strong action inherit it.
  - `emphasis` is a `BlockEmphasis` (`subtler`, `subtle`, `normal`, or `raised`), the
    surface behind the block. A CTA band adds `strong` and `inverted`. Each
    must keep APCA contrast in both themes.
  - `itemEmphasis` is every item's surface at once (cards, questions), never
    per item, and an item may take its own `intent`.
  - `align` and `size` are the preset's alignment and scale; each step down
    from `lg` (`md`, then `sm`) sets the title a step smaller, with smaller
    descriptions and body text and tighter spacing. Space a block's parts with
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
  never its own markup. A band runs full width and rounds at `@7xl:rounded-3xl`;
  with `contained`, it's a panel inside the page padding, rounded at every width.
- **Keys.** List keys use the item's index with its content, so repeated content stays
  distinct.
- **Room for an overhang.** A CTA band with an `image` keeps a top margin for the photo that
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
