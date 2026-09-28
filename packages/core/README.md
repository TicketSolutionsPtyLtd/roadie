# @oztix/roadie-core

The CSS foundation of the [Roadie Design System](https://ticketsolutionsptyltd.github.io/roadie/):
design tokens, colour scales, intents, emphasis, elevation, typography,
interactions and motion, built on Tailwind CSS v4. It also ships the
framework-agnostic helpers the other Roadie packages share.

## Install

```bash
pnpm add @oztix/roadie-core
```

## CSS

Import Roadie in your main stylesheet. The import includes Tailwind CSS v4,
every token and utility, and base styles:

```css
@import '@oztix/roadie-core/css';
```

Then style with utilities. Intent picks the palette, emphasis picks the weight,
and children inherit both:

```html
<div class="intent-accent">
  <button class="is-interactive btn btn-md emphasis-strong rounded-full">
    Buy tickets
  </button>
</div>

<article class="grid emphasis-raised gap-2 rounded-xl p-6">
  <h2 class="text-display-ui-4 text-strong">Tuesday session</h2>
  <p class="text-sm text-subtle">Doors 7pm</p>
</article>
```

Dark mode swaps every token when `<html>` has the `dark` class, so there are
no `dark:` variants. Tailwind's default palette is off: use semantic colours
such as `bg-normal`, `text-subtle` and `border-normal`.

`@oztix/roadie-core/css/compiled` is a prebuilt sheet of Roadie's own
utilities for hosts that can't run Tailwind v4.

## JavaScript

Each helper lives on its own subpath:

| Subpath                               | What it holds                                                                       |
| ------------------------------------- | ----------------------------------------------------------------------------------- |
| `@oztix/roadie-core/utils`            | `cn`, for merging class names                                                       |
| `@oztix/roadie-core/colors`           | Accent and neutral scales from a brand colour, OKLCH conversion, `getContrastColor` |
| `@oztix/roadie-core/theme`            | `getThemeScript`, which sets light or dark before first paint                       |
| `@oztix/roadie-core/datetime`         | House date, time, range, duration and countdown formats                             |
| `@oztix/roadie-core/image`            | Oztix image URLs, widths and `srcset`s                                              |
| `@oztix/roadie-core/navigator`        | The cookie and script that keep `Navigator` expanded or collapsed across loads      |
| `@oztix/roadie-core/dataviz`          | Chart palettes, `chartColorVar`, `chartHex` for canvas and PDF, palette checks      |
| `@oztix/roadie-core/dashboard`        | The dashboard description schema and `validateDashboard`                            |
| `@oztix/roadie-core/dashboard-layout` | Dashboard layout rules without the schema dependency                                |

```ts
import { formatDateRange } from '@oztix/roadie-core/datetime'
import { cn } from '@oztix/roadie-core/utils'
```

## Documentation

Foundations, tokens and guidelines are at
[ticketsolutionsptyltd.github.io/roadie](https://ticketsolutionsptyltd.github.io/roadie/).
For React components, add
[`@oztix/roadie-components`](https://www.npmjs.com/package/@oztix/roadie-components).

## License

ISC &copy; Ticket Solutions Pty Ltd
