# Roadie Design System

A design system for Oztix's applications, built on Tailwind CSS v4 with semantic color tokens, an intent/emphasis styling system, and a React component library.

## Packages

| Package                                           | Description                                                                             |
| ------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [`@oztix/roadie-core`](packages/core)             | CSS foundation — tokens, intents, emphasis, elevation, typography, interactions, motion |
| [`@oztix/roadie-components`](packages/components) | React component library — 24 components built on Base UI                                |
| [`docs`](docs)                                    | Documentation site — Next.js with live code examples                                    |

## Quick start

Install the packages:

```bash
pnpm add @oztix/roadie-core @oztix/roadie-components @phosphor-icons/react
```

Import the CSS in your main stylesheet:

```css
@import '@oztix/roadie-core/css';

/* Scan component dist for Tailwind class detection */
@source '../../node_modules/@oztix/roadie-components/dist';
```

Use components:

```tsx
import { Button, Field } from '@oztix/roadie-components'

function MyApp() {
  return (
    <div className='grid gap-6 p-6'>
      <h1 className='text-display-ui-2 text-strong'>Welcome</h1>
      <p className='text-subtle'>Get started with Roadie.</p>
      <Button intent='accent' emphasis='strong'>
        Get started
      </Button>
    </div>
  )
}
```

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

**Intent** sets the color palette — `intent-accent`, `intent-brand`, `intent-danger`, etc. Children inherit via CSS cascade.

**Emphasis** sets the visual weight — `emphasis-strong` (solid), `emphasis-normal` (bordered), `emphasis-subtle` (tinted), `emphasis-subtler` (minimal).

**Semantic colors** replace default Tailwind colors — `bg-normal`, `text-subtle`, `border-normal`, etc.

**Dark mode** works automatically — add the `dark` class to `<html>`. No `dark:` variants needed.

## Bundle size

|          | Raw     | Gzip    | Brotli |
| -------- | ------- | ------- | ------ |
| Core CSS | 82.6 KB | 12.8 KB | 9.4 KB |

Components are tree-shakeable — import only what you use.

## Development

```bash
corepack enable          # Enable pnpm via corepack
pnpm install             # Install dependencies
pnpm dev                 # Start all packages in dev mode
pnpm build               # Build all packages
pnpm test                # Run tests (276 tests across 27 files)
pnpm typecheck           # TypeScript type checking
pnpm lint                # ESLint
pnpm format              # Prettier
```

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
- Documentation: Next.js v16 with MDX

## License

ISC &copy; Ticket Solutions Pty Ltd
