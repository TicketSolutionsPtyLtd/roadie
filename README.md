# Roadie Design System

A comprehensive design system for Oztix's applications and services.

## Overview

The Roadie Design System is a collection of reusable components, patterns, and guidelines that ensure consistency across Oztix's products.

## Installation

```bash
pnpm install @oztix/roadie-tokens @oztix/roadie-components @oztix/roadie-icons
```

## Usage

```tsx
import { Button } from '@oztix/roadie-components'

function MyComponent() {
  return <Button>Click me</Button>
}
```

## Packages

- `@oztix/roadie-tokens` - Design tokens and theming
- `@oztix/roadie-components` - React component library
- `@oztix/roadie-icons` - Icon package

## Quick Start

1. Install the packages you need:

```bash
pnpm install @oztix/roadie-components
```

2. Import and use components:

```tsx
import { Button, Card, TextField } from '@oztix/roadie-components'

function MyApp() {
  return (
    <Card>
      <TextField label='Name' placeholder='Enter your name' />
      <Button>Submit</Button>
    </Card>
  )
}
```

## Documentation

For detailed documentation and component examples, visit our documentation site.

## Contributing

We welcome contributions! Please read our [contributing guidelines](CONTRIBUTING.md) before submitting changes.

## License

ISC © Ticket Solutions Pty Ltd
