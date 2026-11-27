# @oztix/roadie-illustrations

## 0.2.0

### Minor Changes

- 1c51bfd: Add `@oztix/roadie-illustrations/spot/load`, which loads one spot illustration by name without the rest of the set, for content that names its illustration, such as a CMS field. `isSpotIllustrationName` checks a saved name, `loadSpotIllustration(name)` resolves to its component, and `loadedSpotIllustration(name)` returns it once it has loaded. Under the `node`, `workerd`, and `edge-light` conditions every illustration is loaded already, so a server render never waits. It's about 2.9 kB before an illustration loads.

### Patch Changes

- Updated dependencies [dbaf0ab]
- Updated dependencies [8439a22]
- Updated dependencies [11fc6aa]
- Updated dependencies [3fadb5a]
- Updated dependencies [31eb39d]
- Updated dependencies [811255b]
- Updated dependencies [4439322]
- Updated dependencies [5f33a58]
- Updated dependencies [f92641f]
- Updated dependencies [5343e23]
- Updated dependencies [fb98580]
- Updated dependencies [c925d33]
- Updated dependencies [260ae3c]
- Updated dependencies [04dc330]
- Updated dependencies [4e8b502]
- Updated dependencies [40a22c0]
- Updated dependencies [32c666b]
- Updated dependencies [9b1ef0e]
- Updated dependencies [44501ab]
- Updated dependencies [a71f81b]
- Updated dependencies [523432d]
- Updated dependencies [91b0f63]
- Updated dependencies [37d1715]
  - @oztix/roadie-core@2.14.0

## 0.1.0

### Minor Changes

- c049835: First release of `@oztix/roadie-illustrations`, Oztix's spot illustrations as React components, drawn from SVG sources kept in the package.

  `/spot` exports every spot illustration, such as `Heart`, `Ticket`, `Megaphone`, and the alphabet from `LetterA` to `LetterZ`, plus `SpotIllustration` for drawing your own layers. Each illustration is its own module, so a bundler keeps only the ones you import. `outline` draws a white sticker outline around the art, generated as it renders. Import `@oztix/roadie-illustrations/css` after Roadie's CSS so Tailwind keeps the illustration colours. The sources are published at `/spot/svgs/<name>.svg`, one path per named layer (Shadow, Face, Detail, Highlight, and Stroke). `/spot/catalogue` exports `SPOT_ILLUSTRATIONS`, each illustration's name, file name, label, and tags, for a picker or search. The package's README shows how to add one with `spot:convert`.
