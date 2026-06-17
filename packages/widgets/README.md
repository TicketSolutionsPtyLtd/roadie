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

> **Breaking in `3.0.0`.** The Vue skin now emits raw Roadie/Tailwind utility
> classes (like the React skin) instead of a self-contained `rc-` stylesheet.
> The **host must run Tailwind CSS v4**, import `@oztix/roadie-core/css`, and
> `@source`-scan the widget dist so those utilities compile. A host that does
> neither renders the drawer **unstyled**. Hosts that cannot adopt Tailwind v4
> stay on `2.x`.

```css
/* host global CSS (compiled by the host's Tailwind v4 build) */
@import '@oztix/roadie-core/css';
@source '../node_modules/@oztix/roadie-widgets/dist/cart-drawer/vue';
```

```js
import { createCartClient } from '@oztix/roadie-widgets/cart-drawer/core'
import { CartDrawer } from '@oztix/roadie-widgets/cart-drawer/vue'
// Bespoke cart keyframes (cart-bounce, badge-pop). Everything else — colours,
// spacing, pulse, spin — comes from the host's Tailwind + Roadie core build.
import '@oztix/roadie-widgets/cart-drawer/vue/motion.css'

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
- **`vue/`** — Vue 3 SFC skin. Like the React skin, it emits raw
  Roadie/Tailwind utility classes compiled by the **host's** Tailwind v4 +
  `@oztix/roadie-core` build (single source of truth — core/React/Vue stay in
  sync). The package ships only the bespoke cart keyframes
  (`@oztix/roadie-widgets/<widget>/vue/motion.css`); the host imports them.

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
