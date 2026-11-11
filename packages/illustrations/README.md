# @oztix/roadie-illustrations

Oztix illustrations as React components. The SVG sources in this package are
the source of truth: there's no design file to export from.

Not yet published. Until it is, apps import spot illustrations from
`@oztix/roadie-components/spot-illustrations`.

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

Draw it in the layer colours, in any tool or by hand, then convert it:

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
saves the comparison (`--out sheet.png`, or the OS temp folder), so you can
check nothing moved. Last, it regenerates the components.

Edited a source by hand? Run `pnpm --filter @oztix/roadie-illustrations
spot:generate`. It checks every source against the format and fails with what
to fix, then writes `src/spot/illustrations/` and `src/spot/index.ts`. Don't
edit those generated files; the tests fail if they drift from the sources. It
also warns, without failing, about any source that strays from the style
below.

### Drawing one in code

No design tool needed. A drawing in `drawings/` describes the front of the
object; the kit extrudes it, fits it to the box, and hands it to the converter.

```bash
pnpm --filter @oztix/roadie-illustrations spot:new letter-b
pnpm --filter @oztix/roadie-illustrations spot:draw letter-b --preview b.png
```

`spot:new` starts `drawings/letter-b.ts` from a template. `spot:draw` turns it
into `src/spot/svgs/letter-b.svg` and the `LetterB` component, says how it
measures against the set, and with `--preview` saves a preview sheet.

```ts
import {
  type Drawing,
  rect,
  subtract,
  union
} from '../scripts/spot/draw/index.ts'

export default {
  parts: [
    {
      layer: 'Face',
      shape: subtract(
        union(
          rect(0, 0, 29.4, 21.2, [0.9, 10.6, 10.6, 0]),
          rect(0, 20.4, 32.4, 21.9, [0, 10.95, 10.95, 0.9])
        ),
        rect(11.4, 8, 7.4, 8, [0.3, 4, 4, 0.3]),
        rect(11.4, 24.4, 10.2, 9.4, [0.3, 4.7, 4.7, 0.3])
      )
    }
  ],
  vector: [3.9, 3.67]
} satisfies Drawing
```

Draw the front flat, in any units. The kit in `scripts/spot/draw/` has:

- **Shapes:** `rect` and `polygon` with a radius per corner, `ellipse`, `path`
  for raw path data, `union`, `subtract`, `intersect`, `rotate`, `scale`,
  `translate`, and `tangent`, the points where a straight side meets an ellipse
  without a corner.
- **Parts,** in paint order, each with its `layer`. A part that attaches, such
  as a handle or a knob, goes before the body, so you never see the edge where
  they overlap. Mark a part `inner` when it sits on the front without adding to
  the silhouette (a window, a label, the inside of a bell), so it casts no
  extrusion.
- **`vector`,** which way the depth goes and how far. `extrude` sweeps the
  front back along it. It cuts the outline into faces at its corners and where
  it turns out of view, then draws each face as its own shape. Each face's
  ends become the join lines at corners and creases. A smooth turn gets none.
  A corner eased by under about 1.6 still counts as a corner, as the letters'
  are; a wider rounding reads as one surface.
- **`side`,** which picks each face's layer from whether it's a hole's wall and
  which way it faces. By default a hole's walls are Detail and the rest Shadow,
  as the letters D and B have it. For undersides in Detail, as in E and P, use
  `side: ({ hole, normal }) => hole || normal[1] > normal[0] ? 'Detail' : 'Shadow'`.
- **`lines`,** for marks that bound no fill, such as grip lines.
- **`fit`,** which scales the art so its long side spans 2 to 46, growing it as
  readily as shrinking it, and centres it. `spot:draw` runs it for you.

`spot:preview <name or file.svg>...` renders any sources large on the 48 grid,
then at 96 and 48px, plain and outlined, on light and dark, beside 6 from the
set (`--with` picks others). It saves the sheet to `--out`, or the OS temp
folder.

### The style

Measured across the set. `spot:generate` and `spot:draw` warn when a source
falls outside the ranges in the warning column, which are a little wider than
the set so the set itself passes. An illustration can break a rule on purpose
(Flower Spiral's shadow trails up and left); `ACCEPTED` in
`scripts/spot/check.ts` records those.

| Measure                      | The set                           | Warns outside |
| ---------------------------- | --------------------------------- | ------------- |
| Long side                    | 43 to 44, so 2 to 46              | under 42.9    |
| Short side                   | 32 to 44; Wine Glass is 26        |               |
| Painted share of the box     | 0.37 to 0.61, median 0.46         | 0.35 to 0.63  |
| Face share of what's painted | 0.27 to 0.73, mostly 0.52 to 0.67 |               |
| Shadow share                 | 0.03 to 0.29, mostly 0.10 to 0.21 | 0.025 to 0.30 |
| Detail share, where used     | 0.04 to 0.32, mostly 0.08 to 0.28 |               |
| Highlight share, where used  | 0.09 to 0.12 (Caravan, High Five) |               |
| Stroke share                 | 0.09 to 0.17, median 0.12         | 0.07 to 0.18  |
| Shadow direction             | down, right, or both              | up and left   |
| Path commands in a layer     | under 200                         | over 400      |

- **Depth.** Shadow is the front swept back along one vector, not a copy
  shifted behind it. Compact objects go down and right, 2.5 to 5.5 long at 35
  to 50° (Caravan, Wine Glass, Megaphone, Football, Map Pin, the letters at
  about (3.9, 3.7)). Flat symbols go deeper, 6 to 9, and nearer an axis: Heart
  is about (8.5, 3), Star Rotate (8.25, 0.25), Hand (1, 6.25).
- **Join lines.** A line runs from each hard corner and each crease where two
  parts meet, back along the vector, wherever it shows. A rounded corner gets
  none: it reads as one surface.
- **Detail** is a second visible side or an inner surface: the letters'
  counter walls and undersides, a note's top, a bell's opening, a pin's hole.
  **Highlight** is only for glass, screens, and shine.
- **Stroke** outlines every edge between colours and the silhouette, 0.5 wide
  with round ends. Keep marks inside the silhouette; a mark outside it gets an
  outline of its own that only half joins the rest.
- **Simplify.** Take the silhouette and major parts from a reference and drop
  its inner line work unless the object needs it to be recognised: at most one
  shape inside each part. Show an opening as one edge with one shape inside it,
  never a rim drawn as two parallel lines.
- **Joins.** Where a straight side meets a round part, make it tangent
  (`tangent`), so the sweep stays smooth and no stray join line appears. Where
  two surfaces meet, draw one line that follows the shape round. A mark on a
  part either runs edge to edge or is short and centred, square to the part.
