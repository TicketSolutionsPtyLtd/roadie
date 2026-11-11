---
'@oztix/roadie-illustrations': minor
---

First release of `@oztix/roadie-illustrations`, Oztix's spot illustrations as React components, drawn from SVG sources kept in the package.

`/spot` exports all 176 spot illustrations, such as `Heart`, `Ticket`, `Megaphone`, and `LetterA`, plus `SpotIllustration` for drawing your own layers. Each illustration is its own module, so a bundler keeps only the ones you import. `outline` draws a white sticker outline around the art, generated as it renders. Import `@oztix/roadie-illustrations/css` after Roadie's CSS so Tailwind keeps the illustration colours. The sources are published at `/spot/svgs/<name>.svg`, one path per named layer (Shadow, Face, Detail, Highlight, and Stroke). The package's README shows how to add one with `spot:convert`.
