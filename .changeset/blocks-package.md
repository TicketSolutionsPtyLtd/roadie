---
'@oztix/roadie-blocks': minor
---

First release of `@oztix/roadie-blocks`, designed page sections composed into pages, from code or any CMS.

Blocks take plain props, and editors pick a named `preset` for each one rather than setting options. Blocks share the same `intent`, `emphasis` (`subtler`, `subtle`, `normal`, `raised`, `strong`, or `inverted`, where the text takes a filled surface's own colour), `contained`, `align`, `size` (`sm`, `md`, or `lg`), and `actions` where they apply, with the preset setting their defaults; a Hero takes no `emphasis` or `contained`. Every cropped photo is one of five shapes (`story` 9:16, `portrait` 3:4, `square`, `landscape` 3:2, or `banner` 2:1). This release has the groundwork every block uses:

- `BlocksProvider` (`/provider`) takes `onBlockEvent`, which gets a `view` when half of a block is on screen (or a very tall block reaches the middle of the screen) and a `click` for each link or button inside it, with the block's name, preset, position, and id. An inner provider keeps what it doesn't set from the outer one. Its `renderImage` draws block images, such as with `next/image`.
- `catalogue` (`/catalogue`) lists every block, its group, and its presets for a CMS block picker, with the props each preset reads (`fields`, always with `preset`), its items' (`itemFields`), and its item counts (`limits`), so a CMS can hide and validate fields from it. Each block's `shapes` gives the fields inside every object field, such as an image's `src`, `alt`, `width`, and `height`, so a CMS can build its object types from the catalogue too. It runs without React or any CMS. `groups` lists the picker's groups in page order: Open, Explain, Prove, and Close.
- `/thumbnails/<block>-<preset>.svg` is each preset's wireframe for the picker, and the catalogue gives each preset's file as `thumbnail`, and each block's (its first preset's) too.
- A block's `highlight` and `preset` ignore the invisible characters a live preview adds to strings, and a `preset` a block doesn't have renders its first and warns in development.
- `/css` registers the blocks for Tailwind.
