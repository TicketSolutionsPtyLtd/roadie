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
- `@oztix/roadie-icons` - Icon package (Coming soon)

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
    <View gap='400' bg='bg.subtle'>
      <Heading as='h1' textStyle='display.ui.1'>
        My sweet heading
      </Heading>
      <Text>Some cool content</Text>
      <Button emphasis='accent'>Submit</Button>
    </View>
  )
}
```

## Documentation

For detailed documentation and component examples, visit our documentation site. [Roadie Docs](https://ticketsolutionsptyltd.github.io/roadie/).

## Contributing

If you're making changes, please read our [contributing guidelines](CONTRIBUTING.md) before submitting changes.

## License

ISC © Ticket Solutions Pty Ltd
