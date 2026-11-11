# @oztix/roadie-illustrations

Oztix illustrations as React components. The SVG sources in this package are
the source of truth: there's no design file to export from.

## Setup

Import its CSS after Roadie's, so Tailwind keeps the illustration colours and
sizes the components use:

```css
@import '@oztix/roadie-core/css';
@import '@oztix/roadie-illustrations/css';
```

## Spot illustrations

```tsx
import { Heart, Ticket } from '@oztix/roadie-illustrations/spot'

<Heart />
<Ticket outline className='size-24' />
```

Each illustration is 48px square by default; size it with a `size-*` class. It's
hidden from assistive tech unless you give it an `aria-label`. `outline` draws a
white sticker outline around the art, for busy or dark backgrounds.

Each illustration is its own module, so a bundler keeps only the ones you
import. The sources are published too, at
`@oztix/roadie-illustrations/spot/svgs/<name>.svg`.

For a picker or search, `@oztix/roadie-illustrations/spot/catalogue` exports
`SPOT_ILLUSTRATIONS`: each illustration's component name, file name, label,
and tags.

### The format

A spot illustration is a 48 by 48 drawing made of named layers. Each layer
appears at most once, and each has a fixed colour and a job:

| Layer       | Colour    | What it's for                                                   |
| ----------- | --------- | --------------------------------------------------------------- |
| `Shadow`    | `#0091eb` | The extruded depth: the side faces                              |
| `Face`      | `#e1d1fb` | The object's front surface                                      |
| `Detail`    | `#ffc3a8` | Secondary planes and accents: top faces, bands                  |
| `Highlight` | `#c2dffb` | Glass, screens, and shine                                       |
| `Stroke`    | `#1a1f2b` | Every line, 0.5 wide with round ends; always on top             |
| Outline     | white     | The sticker's cut line, drawn from the art, never drawn by hand |

The fill layers overlap, so their order is part of the drawing; Stroke is
always last. The outline is every layer stroked 4 wide behind the art, so the
art stays 2 inside the box to leave it room.

A source in `src/spot/svgs/` is one `<path>` per layer, with the layer's name as
its `id`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 48 48">
  <path id="Shadow" fill="#0091eb" fill-rule="evenodd" d="…"/>
  <path id="Face" fill="#e1d1fb" fill-rule="evenodd" d="…"/>
  <path id="Stroke" stroke="#1a1f2b" stroke-width=".5" stroke-linecap="round" stroke-linejoin="round" d="…"/>
</svg>
```

Importing that SVG into a design tool gives you the named layers back.

### Adding or changing one

Draw it in the layer colours, in any tool or by hand. Give a new one a few
lowercase tags in `src/spot/tags.json`, under its file name, so the docs
library can find it, such as `"megaphone": ["marketing", "announcement"]`.
Then convert it:

```bash
pnpm --filter @oztix/roadie-illustrations spot:convert path/to/megaphone.svg
```

`spot:convert` takes any SVG drawn in those colours and writes its source:

- shapes of one colour merge into their layer, cut where a shape above covered
  them, so nothing that shows moves
- strokes merge into Stroke, each cut back to the part no fill above it hid
- a white outline, drawn as a fill or a stroke, is dropped
- art that would push the outline out of the box is shrunk just enough
- path data is rounded to 2 decimal places

It then renders each SVG before and after, counts the pixels that changed, and
saves the comparison, so you can check nothing moved. Last, it regenerates the
components.

Edited a source by hand? Run `pnpm --filter @oztix/roadie-illustrations
spot:generate`. It checks every source against the format, and `tags.json`
against the sources, and fails with what to fix, then writes
`src/spot/illustrations/` and `src/spot/index.ts`. Don't edit those generated
files; the tests fail if they drift from the sources.
