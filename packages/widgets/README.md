# @oztix/roadie-widgets

Widget components for the [Roadie Design System](https://github.com/TicketSolutionsPtyLtd/roadie).
Framework-agnostic UI building blocks shared between React and Vue consumers.

> **Pre-1.0.** The API will move. Pin with `~0.x` and check the [changelog](./CHANGELOG.md)
> before upgrading.

## Widgets

### Cart drawer

A shared cart drawer extracted from the Oztix website so it can also run inside
Vue 3 / Webpack consumers. Framework-agnostic core (BYOF transport, drag math,
urgency state machine, formatting, URL validation) with React 19 and Vue 3
skins on top.

See [`docs/plans/2026-05-26-shared-cart-drawer-design.md`](../../docs/plans/2026-05-26-shared-cart-drawer-design.md)
for the full design and integration contract.

## Install

```bash
pnpm add @oztix/roadie-widgets
```

## Quick start

### React (Next.js / Vite / CRA)

```tsx
import { createCartClient } from '@oztix/roadie-widgets/cart-drawer/core'
import { CartDrawer } from '@oztix/roadie-widgets/cart-drawer/react'

const cart = createCartClient({
  host: process.env.NEXT_PUBLIC_OUTLET_HOST,
  fetch: (url, init) => fetch(url, { ...init, credentials: 'include' }),
})

<CartDrawer
  cart={cart}
  collectionId={collectionId}
  onNavigate={(href) => router.push(href)}
  browseHref="/events"
  locale="en-AU"
  currency="AUD"
/>
```

### Vue 3 (Options API, Webpack)

```js
import { createCartClient } from '@oztix/roadie-widgets/cart-drawer/core'
import { CartDrawer } from '@oztix/roadie-widgets/cart-drawer/vue'
import '@oztix/roadie-widgets/cart-drawer/vue/style.css'

app.component('cart-drawer', CartDrawer)

// Outlet is same-origin — no host injection needed.
const cart = createCartClient({ host: '' })
```

```html
<cart-drawer
  :cart="cart"
  :collection-id="collectionId"
  :on-navigate="navigate"
  :refresh-key="cartRefreshKey"
  browse-href="/events"
  locale="en-NZ"
  currency="NZD"
></cart-drawer>
```

## Architecture

Each widget is internally organised as three layers under `src/<widget>/`:

- **`core/`** — Framework-agnostic logic. No React, no Vue, no secrets. Pure
  functions plus a small client factory consumers wire to their own transport.
- **`react/`** — React 19 skin.
- **`vue/`** — Vue 3 SFC skin. Ships a compiled stylesheet
  (`@oztix/roadie-widgets/<widget>/vue/style.css`) for Webpack / SCSS hosts
  without Tailwind.

Subpath exports mean consumers pay only for what they import:

```ts
// React-only consumer never resolves Vue's peers, and vice-versa.
import { CartDrawer } from '@oztix/roadie-widgets/cart-drawer/react'
```

## No secrets in this package

Hosts, auth tokens, and any environment-specific value are **injected** by the
consuming app — never hardcoded. A test in
[`src/cart-drawer/core/secret-guard.test.ts`](./src/cart-drawer/core/secret-guard.test.ts)
guards the package source against shaped secrets and hardcoded `http(s)://`
hostnames.

## License

ISC — see [LICENSE](./LICENSE).
