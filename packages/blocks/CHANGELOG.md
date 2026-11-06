# @oztix/roadie-blocks

## 0.2.0

### Minor Changes

- 88e2597: Add `catalogueSections()` (`@oztix/roadie-blocks/catalogue/sections`), which turns the blocks an app passes into the editor's `sections`: one per block, named such as `heroSection`, a template per preset with its thumbnail from `thumbnailUrl`, and the block's text, layout, alignment, size, surface, and colour as settings.

  Each catalogue block gains `keywords`, such as `cta` and `banner` for Call to action, which the editor's insert menu finds it by. Align, Size and Colour show the block's own default while unset.

  A section's settings now cover every part of its block: images and logos as `image` settings, buttons as a list of `action`s up to the preset's limit, and items such as cards, questions and stats as a `list` of their text and images. Surface shows None while unset.

## 0.1.0

### Minor Changes

- d14f146: Add `CallToAction` (`@oztix/roadie-blocks/call-to-action`), `Gallery` (`@oztix/roadie-blocks/gallery`), and `FAQ` (`@oztix/roadie-blocks/faq`), blocks that close a page with its next step, show its people, events, and partners in photos or logos, and answer its questions in an accordion.

  `CallToAction` has two presets: `photo` sets the pitch beside a photo that breaks out of the panel, portrait (3:4) unless `ratio` says `story`, `square`, `landscape`, or `banner`, tilted unless `tilted` is `false`, with an `illustration` at its corner; `centred` centres the pitch and its buttons. Its `emphasis` adds `strong` and `inverted`, on which its copy and strong action stay readable. `Gallery` has `carousel`, images to step through, `marquee`, images scrolling past that hold still under reduced motion or a pause, and `logos`, a wrapping, centred row of logos at their own shape. Its `ratio` crops carousel and marquee tiles to `story`, `portrait`, `square`, `landscape`, or `banner`, and an image with an `href` is a link. `FAQ` has `accordion`, with each of its `questions` answered in `Prose`, and `itemEmphasis` for its questions (`subtler`, `subtle`, or `normal`).

- 859db9c: Add `Cards` (`@oztix/roadie-blocks/cards`), a block of like items, such as benefits, services, steps, contact options, or people, as cards in columns that follow the block's own width. Its presets are `plain`, `steps`, `text-blocks`, `overlap`, `photo`, and `lists`, and its collection is `cards`. In `plain`, the content picks the card: an image with an illustration overlaps it, and an item with an `href` links its title and makes the whole card clickable. `steps` numbers the cards as an ordered list. `itemEmphasis` sets every card's surface, and an item's `intent` tints its own card.
- 63c0151: Add `Hero` (`@oztix/roadie-blocks/hero`) and `RichText` (`@oztix/roadie-blocks/rich-text`), the blocks that open a page and carry its text. Hero's `bento` preset sets the page's `h1` over a photo beside a looping video and two panels of cycling `images`, `image` sets it beside one photo, cropped to its `ratio` (`banner` by default), `title` is an eyebrow and a large title, and `partner` opens a partner page with the Oztix logo and the partner's logo joined by a heart. RichText's `statement` preset centres a title and a few large paragraphs under an illustration, and `long-form` sets rich text in `Prose` at a reading width.
- 04b9618: Add `Mosaic` (`@oztix/roadie-blocks/mosaic`) and `Testimonial` (`@oztix/roadie-blocks/testimonial`), a grid of photo tiles for visual interest and clients' quotes with their citations.

  `Mosaic` has the `tiles` preset: each tile's logo and description over a photo, tiles in three sizes, all one row tall so they mix (`sm` a square, `md` two columns wide, `lg` the full row), and an optional tile of logos. Tiles take an `href` that makes the whole tile a link. `Testimonial` takes a list of `quotes`, each a large quote in a `figure` with the person's portrait, role, and organisation, over an optional faint `image`. Its `quote` preset shows one; `carousel` steps through two or more with dots or a swipe.

- ad113b3: First release of `@oztix/roadie-blocks`, designed page sections composed into pages, from code or any CMS.

  Blocks take plain props, and editors pick a named `preset` for each one rather than setting options. Blocks share the same `intent`, `emphasis` (`subtler`, `subtle`, `normal`, `raised`, `strong`, or `inverted`, where the text takes a filled surface's own colour), `contained`, `align`, `size` (`sm`, `md`, or `lg`), and `actions` where they apply, with the preset setting their defaults; a Hero takes no `emphasis` or `contained`. Every cropped photo is one of five shapes (`story` 9:16, `portrait` 3:4, `square`, `landscape` 3:2, or `banner` 2:1). This release has the groundwork every block uses:

  - `BlocksProvider` (`/provider`) takes `onBlockEvent`, which gets a `view` when half of a block is on screen (or a very tall block reaches the middle of the screen) and a `click` for each link or button inside it, with the block's name, preset, position, and id. An inner provider keeps what it doesn't set from the outer one. Its `renderImage` draws block images, such as with `next/image`.
  - `catalogue` (`/catalogue`) lists every block, its group, and its presets for a CMS block picker, with the props each preset reads (`fields`, always with `preset`), its items' (`itemFields`), and its item counts (`limits`), so a CMS can hide and validate fields from it. Each block's `shapes` gives the fields inside every object field, such as an image's `src`, `alt`, `width`, and `height`, so a CMS can build its object types from the catalogue too. It runs without React or any CMS. `groups` lists the picker's groups in page order: Open, Explain, Prove, and Close.
  - `/thumbnails/<block>-<preset>.svg` is each preset's wireframe for the picker, and the catalogue gives each preset's file as `thumbnail`, and each block's (its first preset's) too.
  - A block's `highlight` and `preset` ignore the invisible characters a live preview adds to strings, and a `preset` a block doesn't have renders its first and warns in development.
  - `/css` registers the blocks for Tailwind.

- 39f7fc5: Add `SideBySide` (`@oztix/roadie-blocks/side-by-side`), `AlternatingRows` (`@oztix/roadie-blocks/alternating-rows`), and `Stats` (`@oztix/roadie-blocks/stats`), blocks that set text beside media, list like items as rows beside images, and show key numbers on their own.

  `SideBySide` is one section, with three presets: `image-start` and `image-end`, the text after or before an `image` cropped to its `ratio` (`landscape` by default); and `stats`, long-form text beside its `stats` `figures`, which wrap below on narrow screens. `AlternatingRows` has one, `text-blocks`: `rows` of a marked title and text beside a square image, alternating sides. `Stats` has one, `figures`: a heading over a wrapping grid of `stats`, each as written, with a label and an optional spot illustration.

- b6ff15e: Add `types` to `roadie.manifest.json`: each exported object type a component's props name, such as an item in a list prop, with its import path and every field's type, whether it's required, and its description. It follows each field's type to the next type the same package exports, so a CMS or an agent can check every nested field a component needs, such as a Testimonial quote's `person` and that person's `name`, which a prop's type name alone (`readonly TestimonialQuote[]`) didn't say. Fields keep the same rules as props: literal unions are listed in the order they're declared, and fields from the DOM or React are left out. A type re-exported under another name gives that name as `export`, a generic type lists its `typeParameters`, and a type that also takes keys it doesn't name gives their type as `additionalFields`.

### Patch Changes

- Updated dependencies [700daba]
- Updated dependencies [8682b82]
- Updated dependencies [52f8d4e]
- Updated dependencies [b0f142f]
- Updated dependencies [1b02fc5]
- Updated dependencies [18b7674]
- Updated dependencies [ef4073a]
- Updated dependencies [7258634]
- Updated dependencies [1ddb0e9]
- Updated dependencies [b596cb6]
- Updated dependencies [ba2a0a5]
- Updated dependencies [23648c3]
- Updated dependencies [6652cd3]
- Updated dependencies [d10c7ea]
- Updated dependencies [8844f80]
- Updated dependencies [12fb8db]
- Updated dependencies [903a9c9]
- Updated dependencies [f744bdf]
- Updated dependencies [2de86a6]
- Updated dependencies [2e680e2]
- Updated dependencies [4775892]
- Updated dependencies [d89065e]
- Updated dependencies [149f822]
- Updated dependencies [9b08c81]
- Updated dependencies [81db776]
- Updated dependencies [4766b86]
- Updated dependencies [a30fd81]
- Updated dependencies [8bb10ff]
- Updated dependencies [0cc1e1f]
- Updated dependencies [4cbe638]
- Updated dependencies [a54bf74]
- Updated dependencies [64ae958]
- Updated dependencies [1ddb0e9]
- Updated dependencies [8a94353]
- Updated dependencies [a135999]
- Updated dependencies [4766b86]
  - @oztix/roadie-core@2.13.0
