# @oztix/roadie-components

React components for the [Roadie Design System](https://ticketsolutionsptyltd.github.io/roadie/),
built on [Base UI](https://base-ui.com/) and styled with
[`@oztix/roadie-core`](https://www.npmjs.com/package/@oztix/roadie-core).

## Install

```bash
pnpm add @oztix/roadie-core @oztix/roadie-components \
  @base-ui/react @ark-ui/react @phosphor-icons/react class-variance-authority
```

Needs `react` and `react-dom` 19.2 or later.

## Setup

Import both stylesheets. The components sheet carries its own `@source`, so
Tailwind finds the class names in the package without a `node_modules` path:

```css
@import '@oztix/roadie-core/css';
@import '@oztix/roadie-components/css';
```

Mount `RoadieProvider` once at the root. It routes internal `href`s through
your router and sets up theme, toasts and tooltips:

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

## Usage

Import each component from its own subpath:

```tsx
import { Button } from '@oztix/roadie-components/button'
import { Card } from '@oztix/roadie-components/card'
import { Field } from '@oztix/roadie-components/field'

export function Signup() {
  return (
    <Card>
      <Card.Content>
        <form className='grid gap-4'>
          <Field required>
            <Field.Label showIndicator>Email</Field.Label>
            <Field.Input type='email' />
          </Field>
          <Button type='submit' intent='accent' emphasis='strong'>
            Sign up
          </Button>
        </form>
      </Card.Content>
    </Card>
  )
}
```

- **`intent`** picks the palette and **`emphasis`** the weight. Components
  inherit intent from their parent, so set it once on a container.
- **`href`** on any link-bearing component (`Button`, `Card`, `Tabs.Tab`,
  `Menu.Item` and more) routes internal links through `RoadieProvider` and
  opens external ones in a new tab.
- **`Field`** wraps every form control and passes `invalid`, `required` and
  `disabled` down to it.
- There are no Text or Heading components. Use `<p>` and `<h1>` to `<h6>` with
  Roadie's typography utilities.

## Components

| Category      | Components                                                                                                                                          |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Actions       | Button, IconButton, Toggle, ToggleGroup                                                                                                             |
| Forms         | Field, Fieldset, Label, Input, Textarea, Select, Combobox, Autocomplete, Checkbox, CheckboxGroup, RadioGroup, Switch, Slider, NumberField, OTPField |
| Collections   | Accordion, Card, Carousel, Collapsible, List, Marquee, Table                                                                                        |
| Layout        | Pane, ScrollArea, Separator                                                                                                                         |
| Navigation    | Breadcrumb, Navigator, Steps, Tabs                                                                                                                  |
| Overlays      | Dialog, Drawer, Menu, Popover, Toast, Tooltip                                                                                                       |
| Status        | Badge, Callout, Countdown, EmptyState, Progress, Skeleton                                                                                           |
| Text          | CalendarTile, Code, DateTime, Duration, Highlight, Mark, Prose                                                                                      |
| Media & brand | Avatar, IconTile, Image, Logo, QRCode, SpotIllustration                                                                                             |
| Data          | Dashboard, DataCard, DataTable, Delta, Meter, Sparkline, StatTile                                                                                   |

For chart types and chart cards, add
[`@oztix/roadie-charts`](https://www.npmjs.com/package/@oztix/roadie-charts).

`LinkButton` and `LinkIconButton` are deprecated. Use `<Button href>` and
`<IconButton href>`.

## Documentation

Live examples, guidelines and props for every component are at
[ticketsolutionsptyltd.github.io/roadie](https://ticketsolutionsptyltd.github.io/roadie/).

## License

ISC &copy; Ticket Solutions Pty Ltd
