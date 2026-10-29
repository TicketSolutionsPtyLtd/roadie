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

- `definition.ts`: its `BlockDefinition` (name, title, description, and presets, at most two variants), with no React, added to `DEFINITIONS` in `src/catalogue/index.ts`
- `index.tsx`: the block, rendered in `BlockRoot` from `src/_shared/`, taking `preset`, `position`, and plain data props
- a co-located test, and a `*.browser.test.tsx` for layout and axe
- a wireframe per preset in `src/thumbnails/<block>-<preset>.svg`
- a docs page at `docs/src/app/blocks/<block>/page.mdx`

Run `pnpm generate:exports` after adding the folder.

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
