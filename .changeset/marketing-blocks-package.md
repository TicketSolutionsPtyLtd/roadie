---
'@oztix/roadie-marketing-blocks': minor
---

First release of `@oztix/roadie-marketing-blocks`, designed page sections that marketing composes into pages from any CMS.

Blocks take plain props, and editors pick a named `preset` for each one rather than setting options. This release has the groundwork every block uses:

- `MarketingBlocksProvider` (`/provider`) takes `onBlockEvent`, which gets a `view` when half of a block, or half the screen, shows it and a `click` for each link or button inside it, with the block's name, variant, preset, and position. Its `renderImage` draws block images, such as with `next/image`.
- `catalogue` (`/catalogue`) lists every block and its presets for a CMS block picker, and runs without React.
- `/thumbnails/<block>-<preset>.svg` is each preset's wireframe for the picker, and the catalogue gives each preset's file as `thumbnail`.
- `/css` registers the blocks for Tailwind.
