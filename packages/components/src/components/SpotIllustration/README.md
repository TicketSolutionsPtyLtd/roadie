# SpotIllustration System

A fully automated system for creating themed SVG illustrations that adapt to the design system's color palette.

## Quick Start

### Adding a New Illustration

1. **Export from Figma**: Save your SVG to `svgs/your-name.svg`
2. **Run the script**: `pnpm build:spotillustration`
3. **Done!** Your component is ready to use

The script automatically generates:

- Optimized JSON data file
- React TypeScript component
- Updated exports in `index.tsx`

### Development Workflow

During development, the script runs in watch mode:

```bash
pnpm dev
```

Any SVG files added or modified in the `svgs/` directory will automatically trigger:

1. SVG optimization
2. Component generation
3. Export updates

No manual intervention required.

## Design Requirements

### Frame Size

Use a **48x48** frame in Figma (or maintain the same aspect ratio).

### Color Palette

Use these exact hex colors in your Figma design. The script categorizes paths by color:

| Color       | Hex       | Layer       | Purpose                                  |
| ----------- | --------- | ----------- | ---------------------------------------- |
| White       | `#ffffff` | `outline`   | White stroke outline (hidden by default) |
| Purple tint | `#E1D1FB` | `face`      | Main fills, primary shapes               |
| Orange tint | `#FFC3A8` | `detail`    | Accent details, highlights               |
| Blue        | `#0091EB` | `shadow`    | Shadow layers, depth                     |
| Light blue  | `#C2DFFB` | `highlight` | Light highlights, shine                  |
| Near black  | `#1A1F2B` | `stroke`    | Outlines, strokes                        |

### Layer Ordering

SVG renders paths in order, so arrange layers intentionally:

1. Outline (if needed)
2. Shadows (background)
3. Face/main shapes
4. Details
5. Highlights (foreground)
6. Strokes (top layer)

The script preserves your exact path order from Figma.

## How the Script Works

### Build Script: `svg-to-spot-illustration.cjs`

Location: `packages/components/scripts/svg-to-spot-illustration.cjs`

#### Process Flow

1. **SVG Optimization** (SVGO)
   - Removes unnecessary attributes
   - Cleans up paths
   - Removes dimensions (preserves viewBox)
   - Skip with `--no-optimize` flag if needed

2. **Path Categorization**
   - Reads semantic illustration tokens from `@oztix/roadie-core`
   - Matches each path's fill/stroke color to closest token color
   - Assigns semantic layer name (face, detail, shadow, etc.)
   - Preserves exact path order from source SVG

3. **JSON Generation**
   - Creates optimized JSON in `json/` directory
   - Structure:
     ```json
     {
       "$comment": "Generated file - do not edit directly",
       "viewBox": "0 0 48 48",
       "paths": [{ "d": "M26.179...", "layer": "face" }]
     }
     ```

4. **Component Generation**
   - Converts `kebab-case.svg` → `PascalCase.tsx`
   - Uses `createSpotIllustration` factory
   - Adds TypeScript types
   - Example output:

     ```tsx
     // Generated file - do not edit directly
     import { createSpotIllustration } from './createSpotIllustration'
     import heartData from './json/heart.json'

     export const Heart = createSpotIllustration('Heart', heartData)
     export type HeartProps = React.ComponentPropsWithRef<typeof Heart>
     ```

5. **Export Updates**
   - Scans directory for all component files
   - Updates `index.tsx` with alphabetically sorted exports
   - Preserves base component exports (SpotIllustration, createSpotIllustration)

### Usage Modes

**Build all SVGs:**

```bash
pnpm build:spotillustration
```

**Build specific SVG:**

```bash
pnpm build:spotillustration src/components/SpotIllustration/svgs/heart.svg
```

**Watch mode (auto-rebuild on changes):**

```bash
pnpm build:spotillustration --watch
```

**Skip optimization:**

```bash
pnpm build:spotillustration --no-optimize
```

### Color Matching Algorithm

The script uses Euclidean distance in RGB color space to match fills/strokes to semantic tokens:

1. Normalize colors (expand short hex, lowercase)
2. Calculate RGB distance to each token color
3. Assign to closest matching layer
4. Default to 'face' if distance > 100 (no close match)
5. Strokes (paths with stroke but no fill) → 'stroke' layer

## Component Architecture

### Base Component: `SpotIllustration`

Accepts illustration data and renders themed SVG:

```tsx
<SpotIllustration
  illustration={illustrationData}
  boxSize='600'
  outline={false}
/>
```

### Factory: `createSpotIllustration`

Creates pre-configured components from JSON data:

```tsx
export const Heart = createSpotIllustration('Heart', heartData)
```

This returns a component with:

- Pre-loaded illustration data
- Forward ref support
- All SpotIllustration props except `illustration`
- TypeScript types

### Styling System

Components use PandaCSS with semantic tokens:

- `colorPalette` system for theming
- Data attributes for layer targeting: `data-part="face"`, `data-part="shadow"`, etc.
- `outline` variant to show/hide white outline
- All PandaCSS style props supported

## File Structure

```
SpotIllustration/
├── README.md                          # This file
├── SpotIllustration.tsx              # Base component
├── createSpotIllustration.tsx        # Factory function
├── index.tsx                         # Exports (auto-updated)
├── svgs/                             # Source SVG files
│   ├── heart.svg
│   ├── high-five.svg
│   └── note-music.svg
├── json/                             # Generated JSON (do not edit)
│   ├── heart.json
│   ├── high-five.json
│   └── note-music.json
├── Heart.tsx                         # Generated component (do not edit)
├── HighFive.tsx                      # Generated component (do not edit)
└── NoteMusic.tsx                     # Generated component (do not edit)
```

## Troubleshooting

### Colors Not Matching Correctly

- Verify you're using exact hex colors from the table above
- Check that fills/strokes are applied directly to paths (not groups)
- Try `--no-optimize` if SVGO is changing colors

### Wrong Layer Order

- Check layer order in Figma (bottom to top)
- SVG renders paths sequentially
- Reorder in Figma and re-export

### Component Not Exported

- Check that `index.tsx` was updated (should happen automatically)
- Run `pnpm build:spotillustration` again
- Verify component file was created in SpotIllustration directory

### Watch Mode Not Detecting Changes

- Ensure file is saved in `svgs/` directory with `.svg` extension
- Check terminal for error messages
- Restart watch mode if needed

## Advanced Usage

### Custom Illustrations at Runtime

Use the base component with custom JSON data:

```tsx
import { SpotIllustration } from '@oztix/roadie-components'

const customData = {
  viewBox: "0 0 48 48",
  paths: [
    { d: "M10,10 L30,30", layer: "stroke" }
  ]
}

<SpotIllustration illustration={customData} />
```

### Importing from Dedicated Export Path

```tsx
import { Heart, NoteMusic } from '@oztix/roadie-components/spot-illustrations'
```

This import path only includes SpotIllustration components, useful for tree-shaking.

## Contributing

When adding new illustrations:

1. Follow the design requirements above
2. Use descriptive, kebab-case filenames (e.g., `music-note.svg`, not `icon-1.svg`)
3. Test in both light and dark themes
4. Verify outline variant works if applicable
5. Run the build script and commit all generated files

## Related Files

- Script: `packages/components/scripts/svg-to-spot-illustration.cjs`
- Tokens: `packages/core/src/tokens/semantic-tokens.json`
- Documentation: `docs/src/app/components/spot-illustration/page.mdx`
