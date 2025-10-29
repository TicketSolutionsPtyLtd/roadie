# Roadie Design System

A comprehensive design system for Oztix's applications and services.

## Overview

The Roadie Design System is a collection of reusable components, patterns, and guidelines that ensure consistency across Oztix's products.

## Installation

```bash
pnpm install @oztix/roadie-core @oztix/roadie-components
```

## Usage

```tsx
import { Button } from '@oztix/roadie-components'

function MyComponent() {
  return <Button>Click me</Button>
}
```

## Packages

- `@oztix/roadie-core` - Design tokens and Panda CSS utilities
- `@oztix/roadie-components` - React component library

## Quick Start

1. Install the packages you need:

```bash
pnpm install @oztix/roadie-components
```

2. Import and use components:

```tsx
import { Button, Heading, Text, View } from '@oztix/roadie-components'

function MyApp() {
  return (
    <View gap='400' bg='neutral.surface.subtle'>
      <Heading as='h1' textStyle='display.ui.1'>
        My sweet heading
      </Heading>
      <Text>Some cool content</Text>
      <Button colorPalette='accent' emphasis='strong'>
        Submit
      </Button>
    </View>
  )
}
```

## Using CSS Tokens (Non-React Projects)

If you're working on a non-React project (Vue, Svelte, vanilla JS, etc.), you can use just the design tokens as CSS variables:

### Installation

```bash
npm install @oztix/roadie-core
```

### Usage

Import the CSS files into your project:

```css
/* In your main CSS file or entry point */
@import '@oztix/roadie-core/tokens.css';
@import '@oztix/roadie-core/utilities.css';
```

Or import in JavaScript/TypeScript:

```javascript
import '@oztix/roadie-core/tokens.css'
import '@oztix/roadie-core/utilities.css'
```

### Using CSS Variables

All design tokens are available as CSS custom properties:

```css
.my-component {
  /* Colors */
  background-color: var(--colors-neutral-surface);
  color: var(--colors-neutral-fg);
  border: 1px solid var(--colors-neutral-border);
  
  /* Spacing */
  padding: var(--spacing-400);
  gap: var(--spacing-200);
  
  /* Typography */
  font-family: var(--fonts-ui);
  font-size: var(--font-sizes-md);
  line-height: var(--line-heights-ui);
  
  /* Shadows */
  box-shadow: var(--shadows-raised);
  
  /* Border radius */
  border-radius: var(--radii-md);
}
```

### Dark Mode

Dark mode is automatically supported. Add the `data-color-mode` attribute to your root element:

```html
<!-- Light mode (default) -->
<html>...</html>

<!-- Dark mode -->
<html data-color-mode="dark">...</html>
```

Toggle dark mode with JavaScript:

```javascript
// Toggle dark mode
document.documentElement.setAttribute('data-color-mode', 'dark')

// Toggle back to light mode
document.documentElement.removeAttribute('data-color-mode')
// or
document.documentElement.setAttribute('data-color-mode', 'light')
```

### Text Style Utilities

Pre-built text style classes are available in `utilities.css`:

```html
<h1 class="text-styles-display-ui-1">Large Heading</h1>
<h2 class="text-styles-display-ui-2">Medium Heading</h2>
<p class="text-styles-prose">Body text for articles and long-form content</p>
<small class="text-styles-ui-meta">Small metadata text</small>
```

### Available Token Categories

- **Colors**: `--colors-*` (neutral, accent, brand, success, warning, danger)
- **Spacing**: `--spacing-*` (025, 050, 100, 200, 300, 400, 500, 600, 800, 1000)
- **Typography**: `--fonts-*`, `--font-sizes-*`, `--font-weights-*`, `--line-heights-*`, `--letter-spacings-*`
- **Shadows**: `--shadows-*` (raised, overlay, modal, sunken)
- **Radii**: `--radii-*` (sm, md, lg, full)
- **Blurs**: `--blurs-*` (sm, base, md, lg, xl, 2xl, 3xl)
- **Breakpoints**: `--breakpoints-*` (sm, md, lg, xl, 2xl)

For a complete list of available tokens, see the [token documentation](https://ticketsolutionsptyltd.github.io/roadie/tokens).

## Documentation

For detailed documentation and component examples, visit our documentation site. [Roadie Docs](https://ticketsolutionsptyltd.github.io/roadie/).

## Contributing

If you're making changes, please read our [contributing guidelines](CONTRIBUTING.md) before submitting changes.

## License

ISC © Ticket Solutions Pty Ltd

## Tech Stack

- Package Manager: pnpm@9.15.0
- Build System: Turborepo
- Framework: React (using react-aria-components)
- Styling: PandaCSS
- Language: TypeScript
- Documentation: Next.js with MDX

## Key Dependencies

- React v19.0.0
- Next.js v15.0.0
- PandaCSS v0.48+
- react-aria-components v1.0.0
- TypeScript v5.x
