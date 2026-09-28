# Roadie Design System

A design system for Oztix's applications, built on Tailwind CSS v4 with semantic colour tokens, an intent and emphasis styling system, a React component library, and charts.

## Packages

| Package                                           | Description                                                                            |
| ------------------------------------------------- | -------------------------------------------------------------------------------------- |
| [`@oztix/roadie-core`](packages/core)             | CSS foundation: tokens, intents, emphasis, elevation, typography, interactions, motion |
| [`@oztix/roadie-components`](packages/components) | React components built on Base UI                                                      |
| [`@oztix/roadie-charts`](packages/charts)         | Chart types, chart cards and dashboards                                                |
| [`@oztix/roadie-widgets`](packages/widgets)       | Shared widgets with React and Vue skins, such as the cart drawer                       |
| [`docs`](docs)                                    | Documentation site: Next.js with live code examples                                    |
| [`skills`](skills)                                | Claude Code plugin with Roadie skills, such as `/roadie:audit`                         |

## Quick start

Install the packages:

```bash
pnpm add @oztix/roadie-core @oztix/roadie-components @phosphor-icons/react
```

Import the CSS in your main stylesheet. Each package ships its own `@source`,
so import every package you use:

```css
@import '@oztix/roadie-core/css';
@import '@oztix/roadie-components/css';
```

Mount `RoadieProvider` once at the root. It routes `href`s through your router
and sets up theme, toasts and tooltips:

```tsx
// app/providers.tsx
'use client'

import type { ReactNode } from 'react'

import NextLink from 'next/link'

import { RoadieProvider } from '@oztix/roadie-components'

export function Providers({ children }: { children: ReactNode }) {
  return <RoadieProvider link={NextLink}>{children}</RoadieProvider>
}
```

Use components from their subpaths:

```tsx
import { Button } from '@oztix/roadie-components/button'

export function Welcome() {
  return (
    <div className='grid gap-6 p-6'>
      <h1 className='text-display-ui-2 text-strong'>Welcome</h1>
      <p className='text-subtle'>Get started with Roadie.</p>
      <Button href='/events' intent='accent' emphasis='strong'>
        Browse events
      </Button>
    </div>
  )
}
```

See [Installation](https://ticketsolutionsptyltd.github.io/roadie/overview/getting-started)
for fonts, provider options and scoped providers.

## CSS-only usage (Vue, Svelte, etc.)

Install the core package only:

```bash
pnpm add @oztix/roadie-core
```

Import the CSS and use utility classes directly:

```css
@import '@oztix/roadie-core/css';
```

```html
<button
  class="is-interactive btn btn-md emphasis-strong rounded-full intent-accent"
>
  Submit
</button>
```

See the [Vue integration guide](https://ticketsolutionsptyltd.github.io/roadie/overview/vue-integration) for detailed setup.

## Key concepts

**Intent** sets the colour palette: `intent-accent`, `intent-brand`,
`intent-danger` and so on. Children inherit it through the cascade.

**Emphasis** sets the visual weight: `emphasis-strong` (solid),
`emphasis-normal` (bordered), `emphasis-subtle` (tinted), `emphasis-subtler`
(minimal), plus surfaces such as `emphasis-raised` and `emphasis-floating`.

**Semantic colours** replace Tailwind's palette: `bg-normal`, `text-subtle`,
`border-normal` and so on.

**Dark mode** needs no `dark:` variants. `RoadieProvider` sets the `dark` class
on `<html>`, and every token swaps.

## Bundle size

|          | Raw      | Gzip    | Brotli  |
| -------- | -------- | ------- | ------- |
| Core CSS | 134.7 KB | 19.7 KB | 14.9 KB |

Components are tree-shakeable. Import each one from its subpath.

## Development

```bash
corepack enable          # Enable pnpm via corepack
pnpm install             # Install dependencies
pnpm dev                 # Start all packages in dev mode
pnpm build               # Build all packages
pnpm test                # Run tests
pnpm test:browser        # Run layout tests in Chromium, WebKit and Firefox
pnpm typecheck           # TypeScript type checking
pnpm lint                # ESLint
pnpm format              # Prettier
```

`pnpm test:browser` runs every engine by default, as CI does. To pick engines,
set `ROADIE_BROWSERS`, for example `ROADIE_BROWSERS=chromium,webkit
pnpm test:browser` on a Mac where Playwright's Firefox won't start.

## Documentation

Browse the full documentation at [ticketsolutionsptyltd.github.io/roadie](https://ticketsolutionsptyltd.github.io/roadie/).

## Tech stack

- Package manager: pnpm with corepack
- Build system: Turborepo
- Framework: React v19
- Component primitives: @base-ui/react
- Icons: @phosphor-icons/react
- Styling: Tailwind CSS v4 with custom `@utility` directives
- Language: TypeScript (strict mode)
- Charts: TanStack Charts
- Testing: Vitest, with browser mode on Playwright for layout
- Documentation: Next.js v16 with MDX

## License

ISC &copy; Ticket Solutions Pty Ltd
