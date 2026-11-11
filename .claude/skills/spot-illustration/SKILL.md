---
name: spot-illustration
description: Use when drawing a new Roadie spot illustration in code, in the set's style, or redrawing one. Starts from a reference, builds the front from shapes with the spot kit, extrudes and fits it, checks it in a preview sheet beside the set, and commits the source and component. Triggers on "draw a spot illustration", "new spot illustration", "add an illustration of", "draw the letter", "redraw the megaphone".
---

# Spot illustration

Draw a spot illustration as code in `packages/illustrations`. The package
README is the reference: read its "Drawing one in code" and "The style"
sections first. Run every command with
`pnpm --filter @oztix/roadie-illustrations`.

## 1. Find a reference

- Check the set first: if `src/spot/svgs/` has the object, change that source
  instead of drawing it again. Figma holds nothing the set doesn't: its
  letters set as text are still to draw.
- Otherwise take a line icon (Phosphor, say) or a sketch from the person
  asking. It gives the silhouette and the major parts; the style turns it into
  an extruded sticker.
- Pick 2 or 3 set members of the same kind to match: letters for letters,
  compact objects (Megaphone, Map Pin, Caravan) for things, flat symbols
  (Heart, Star Rotate) for symbols. `spot:preview <them> --out ref.png` and
  look.

## 2. Draw the front

```bash
pnpm --filter @oztix/roadie-illustrations spot:new <name>
```

Edit `drawings/<name>.ts`:

- Build each part from `rect`, `polygon`, `ellipse`, `union`, `subtract`, and
  `tangent`. Draw flat, in any units; `fit` sizes it.
- List parts in paint order, attached parts before the body. Mark windows,
  labels, and openings `inner`.
- Set `vector` from the style table: about (3, 3.5) for a compact object,
  (3.9, 3.7) for a letter, deeper and flatter for a flat symbol.
- Keep it simple: the silhouette, the major parts, at most one shape inside
  each part, no marks outside the silhouette.

## 3. Draw, preview, repeat

```bash
pnpm --filter @oztix/roadie-illustrations spot:draw <name> --preview <name>.png
```

Read the sheet, at 384 on the grid and at 48px:

- Does it read at 48px, and sit at the same weight as its neighbours?
- Is there a join line at every hard corner and crease, and none at a rounded
  corner or a smooth turn?
- Does each face have the right layer? Change `side` if not.
- Act on every style warning `spot:draw` prints, or say why it stands.

Show the sheet to the person asking after each round, and change what they
point out. They judge the details: join lines, which sides are Detail, line
density.

## 4. Check and commit

Give it a few lowercase tags in `packages/illustrations/src/spot/tags.json`,
under its name, so the docs library can find it: words it shows or suits,
such as `"megaphone": ["marketing", "announcement"]`. The check fails a source
with no tags.

```bash
pnpm test:gated illustrations scripts
pnpm --filter @oztix/roadie-illustrations typecheck
pnpm --filter @oztix/roadie-illustrations build
pnpm --filter @oztix/roadie-illustrations size
```

`size` measures `dist`, so build first. Commit `drawings/<name>.ts`,
`src/spot/svgs/<name>.svg`, its line in `src/spot/tags.json`, and the generated `src/spot/illustrations/` and
`src/spot/index.ts` together. If the "Every spot illustration" budget in
`.size-limit.json` fails, raise it to about 10% over.
Put the preview sheet in the PR as its evidence.
