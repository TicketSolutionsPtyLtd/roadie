# Shared CartDrawer — Cross-Framework Design

**Date:** 2026-05-26
**Status:** Design — cross-repo review incorporated, pre-implementation
**Author:** brycewoods

## Goal

Extract the `CartDrawer` that currently lives in the public-facing website
(React/Next.js) into shared, publishable packages so it can be consumed by:

- **The website app** — React 19 / Next.js 16
- **The outlet/storefront app** — Vue 3 (Options API, plain JS, Webpack,
  SCSS, no Tailwind)

> Note: this doc lives in the public Roadie repo. It deliberately avoids
> private repo **paths**, internal config categories, hosts, and any credential
> detail. It _does_ cite bare source filenames and line numbers (e.g.
> `CartDrawer.tsx:128`) as breadcrumbs for implementers — these reveal no
> secrets and no repo structure, just where to look once you're in the private
> app repo.

Two hard requirements drive the design:

1. **No private values may be committed to the public Roadie repo / npm
   packages.** Everything environment-specific or secret is injected at
   runtime by the consuming app.
2. **The same behaviour ships to both a React app and a Vue app** without
   forcing one framework's runtime into the other.

## Why not a single Web Component

A Web Component (custom element) is the textbook answer for "one UI, many
frameworks" — but only for **simple, mostly-stateless primitives** (buttons,
badges, inputs). The CartDrawer is the opposite: drag gestures with
velocity-based snapping, spring animations (`motion/react`), data fetching,
a countdown/urgency timer, focus locking, and body-scroll locking. Industry
guidance (Smashing, Vue docs, TanStack) is consistent: complex, multi-source
stateful UI is painful in vanilla/Lit custom elements.

Concretely for our stack:

- Wrapping the existing React component as a custom element bundles React
  _inside_ the element — so the outlet app's Vue bundle would still ship React
  and hit its Webpack `node_modules`-exclude rules. Genuinely avoiding React
  means a full **rewrite in Lit** — a third codebase, not reuse.
- Shadow DOM blocks external CSS, needs CSS-in-JS injection, and doesn't SSR.
- Vue ↔ custom-element slot/event mismatches add wrapper glue anyway.

**Decision:** framework-agnostic core + thin per-framework skins — the same
architecture TanStack Query uses (`query-core` + `react-query` / `vue-query`).

## Architecture: one package now, 3-way split later

For now this lives as a **single package** at `packages/roadie-cart/`
(`@oztix/roadie-cart`), internally organised into the same three layers so the
split into separate packages later is mechanical rather than a rewrite.

```
packages/roadie-cart/            -> @oztix/roadie-cart  (one version)
  src/core/    No React, no Vue, no secrets.
               - Cart client factory (BYOF transport)
               - Endpoint PATHS + response types
               - Drag/snap math (decideSnapTarget)
               - Urgency-timer state machine
               - Currency + date formatting
  src/react/   React <CartDrawer/> skin on top of core. Website consumes this.
  src/vue/     Vue 3 <CartDrawer/> skin on top of core. Ships compiled CSS.
               Outlet app consumes this.

Subpath exports (consumers import only what they need; bundlers tree-shake):
  @oztix/roadie-cart/core
  @oztix/roadie-cart/react
  @oztix/roadie-cart/vue
  @oztix/roadie-cart/vue/style.css
```

You write the _brains_ once (core) and two thin _skins_. Each app renders
natively — no React-in-Vue, no shadow-DOM styling fights, SSR stays fine.
The drag math and API contract (most likely to drift or harbour bugs) stay
single-sourced.

> **Keeping React and Vue in one package without cross-contaminating
> consumers (review finding #4, adapted).** The React skin pulls heavy,
> cart-only deps (`motion`, `@number-flow/react`, `react-focus-lock`); the Vue
> skin pulls its own (Vue, a Vue focus-trap, an animation lib). In a single
> package these go in **`peerDependencies` marked `optional` via
> `peerDependenciesMeta`**, and each framework's code sits behind its own
> subpath export. A React-only consumer importing `…/react` never resolves the
> Vue deps and gets no Vue peer warnings, and vice-versa. The React skin uses
> `@oztix/roadie-components` (Button, Badge) as a normal dependency.
>
> **Deliberately NOT folded into `@oztix/roadie-components`.** That would push
> the cart's heavy deps onto every design-system consumer. `roadie-cart` stays
> separate so the dependency surface is opt-in. When it stabilises, `src/core`
> / `src/react` / `src/vue` graduate into standalone packages
> `@oztix/roadie-cart-core` / `@oztix/roadie-cart-react` /
> `@oztix/roadie-cart-vue` — consumers swap a subpath (`/core`) for a package
> suffix (`-core`), a near-mechanical change.

## The core client: Bring Your Own Fetch (BYOF)

`@oztix/roadie-cart/core` is a small **cart client factory**. Self-contained
logic; injected transport.

```ts
const cart = createCartClient({
  host, // injected by the app (from its private config) — never hardcoded
  fetch: myFetch // optional; defaults to global fetch. App injects one with
  // auth/cookies/interceptors already wired.
})

await cart.getSummary(collectionId) // -> CartSummary
await cart.getDetails(collectionId) // -> CartDetails
cart.checkoutUrl(details) // -> string  (host + validated extrasUrl)
```

**`checkoutUrl(details)` must validate, not blindly concatenate (review
finding #2/security).** Because the resulting URL flows to `onNavigate` — which
bypasses Roadie's built-in link sanitization — `extrasUrl` is treated as
untrusted input. The client requires it to be a **same-origin path beginning
with a single `/`** and rejects protocol-relative (`//`), absolute schemes
(`http:`, `https:`), and dangerous schemes (`javascript:`, `data:`, etc.). A
failed check throws / returns `null` rather than producing a navigable
cross-origin or script URL.

Inside core (single source of truth, none of it secret):
endpoint **paths**, response parsing, `CartSummary` / `CartDetails` /
`CartEvent` / `CartTicket` types, `decideSnapTarget` drag math, the
urgency-timer state machine, currency formatting.

Injected by the app (so nothing private is baked in):
the `host`, and optionally a `fetch` (Website passes one with
`credentials: 'include'`; the outlet app can use native `fetch`).

Each skin keeps its native reactivity:

- **React** — `useQuery(['cartSummary', id], () => cart.getSummary(id))`
- **Vue** — a composable (`@tanstack/vue-query` _or_ a plain `ref` +
  `onMounted` calling `cart.getSummary(id)`) — see Open Questions.

## Secrets / privacy analysis — confirmed no leak

The test for "is this a leak" is **"is the value secret?"**, not "is it in a
public repo". A value is sensitive only if knowing it grants access or reveals
something not already public.

| Part                   | Example                                    | Self-contained or injected? | Secret?                                |
| ---------------------- | ------------------------------------------ | --------------------------- | -------------------------------------- |
| Endpoint **path**      | `/outlet/api/collection/{id}/cart/summary` | Self-contained in core      | No — visible in any browser's DevTools |
| **Host** / base domain | `https://…`                                | Injected by the app         | No, but environment-specific → inject  |
| **Auth**               | session cookie                             | Never in code               | Yes — rides on `credentials:'include'` |

The CartDrawer reads **no** API keys, tokens, or auth headers (verified in the
source). The broader app's third-party keys live in its own runtime config
object; the cart code reads none of them.

Structural guarantee for `roadie-cart`'s core layer (`src/core`):

- ✅ Allowed (public): endpoint _paths_, response _types_, drag math,
  formatting — all observable / non-secret.
- 🚫 Never: the host, any key/token, any environment value. These are
  runtime _parameters_ the app injects from its own private config.

Because secrets can only enter via the injected `host` + `fetch` (constructed
in each app's private repo), there is no code path for a credential to reach
the public package.

**Proposed CI guard (open question):** a test in `roadie-cart` (core layer) that fails
the build if a hardcoded `http(s)://` domain or anything key-shaped appears in
the package source — turning the rule into something enforced, not documented.

## Dynamic links & navigation audit

A source-level audit of the current cart found the dynamic behaviour below.
Anything routing/context-specific moves to the component's prop seam.

### ✅ Handled by the design

- **Checkout URL** — built as `outletHost + details.extrasUrl`
  (`CartDrawer.tsx:128`). `extrasUrl` is per-cart, returned by the API; host is
  injected. Maps onto `cart.checkoutUrl(details)`. Routing happens via
  `onNavigate(href)`.
- **Browser APIs** — Escape-to-close, body-scroll lock, resize /
  `visualViewport`, urgency countdown. All SSR-guarded and portable as-is.

### ⚠️ Would break — fixed by passing in props

- **"Browse Events" link (empty state)** — `CartEmptyState.tsx:20` builds a
  hardcoded, app-specific relative URL `/collection/?id=…` via
  `buildCollectionUrl()`. That route only exists in the website.
  **Fix:** require a passed-in `browseHref` (or `buildBrowseUrl` callback).
- **Checkout button uses `next/link`** — `CartContents.tsx` renders the
  checkout button via the app's `LinkButton`, which imports `next/link`
  (`Link.tsx:3`). This import _fails outright_ in any non-Next React app and is
  meaningless in Vue. **Fix:** the shared drawer never uses `LinkButton`; it
  renders a plain `<a>` / Roadie `Button` and routes through `onNavigate(href)`.
  (Matches Roadie's framework-agnostic linking philosophy — the
  provider/callback is the only seam.)

### ⚠️ Constraint, not a break

- **Event images** — `CartEventGroup.tsx:50` renders `<img src={imageUrl}>`
  (plain tag, not `next/image`), fed by the API. A relative URL that only
  resolves inside the website would 404 elsewhere. (CORS is _not_ required for
  plain `<img>` display — see the image-URL note in the data-shape contract.)
  **Fix:** document the contract — API must return absolute / resolvable URLs.

### Stays in the host app (not extracted)

- **`CartDrawerMount`** — the `useRouter` / `usePathname` /
  `useCollectionRoute` wrapper is pure Next.js glue. Each app writes its own
  ~10-line mount.
- **PostHog click tracking** — rode on `LinkButton`; since we drop
  `LinkButton`, tracking moves to the consumer (`<Tracked>` wrapper pattern).

## Prop / config API

The break-fixes resolve into a small set of required, non-secret inputs:

```ts
<CartDrawer
  cart={cart}                  // core client (host + fetch injected)
  collectionId={id}
  onNavigate={(href) => …}     // REQUIRED — was optional/silent before
  browseHref="/events"         // app-specific; replaces hardcoded /collection/
  locale="en-AU"               // REQUIRED — see review finding #1
  currency="AUD"               // REQUIRED — see review finding #1
  refreshKey={n}               // optional — bump to force a refetch (finding #6)
  lockBodyScroll={true}        // optional, default true
  initialState="closed"        // optional (uncontrolled)
  onOpenChange={(open) => …}   // optional — see review finding #9
  onExpire={() => …}           // optional — see review finding #10
/>
```

`onNavigate` becomes **required** (no silent no-op fallback). The React and
Vue skins expose the same prop shape.

## Review findings — gaps to fix before implementation

Two passes informed this section: a source read of the React drawer
(`CartDrawer.tsx`, `CartContents.tsx`, `CartUrgencyBadge.tsx`,
`formatCurrency.ts`), and a deeper cross-repo review that also inspected the
outlet app's cart API mapping, Webpack config, and Add-to-Cart flow. The
cross-repo review surfaced four issues the first pass missed (#2, #6, #7, #8) —
including a **second hard break** (the date contract). File:line references
below point into the **private app repos** (kept out of this public doc's prose
intentionally — implementers have them).

### MUST-FIX

1. **`locale` + `currency` — real cross-app bug, and broader than first
   thought.** Australian currency/date are hardcoded in _multiple_ spots, not
   just one helper:
   - `formatCurrency` → `toLocaleString('en-AU', { currency:'AUD' })`
   - `CartContents` day headers → `new Intl.DateTimeFormat('en-AU', …)`
   - `$` is hardcoded directly in the drawer header/footer
     (`CartDrawerHandle.tsx:152`, a `NumberFlow` prefix) and in event rows
     (`CartEventGroup.tsx:82`)

   The outlet app carries a NZ context where prices are **NZD**.
   Shipping the hardcoded formatter renders the wrong currency. The drawer must
   accept `locale` + `currency` (or injectable `formatCurrency` / `formatDate`)
   and use them **everywhere** — including the `NumberFlow` prefixes. Formatting
   logic lives in `roadie-cart`'s core layer so both skins share it.

2. **API date contract — the second hard break (NEW).** The drawer treats
   `eventDate` as an **ISO** string: it sorts with `localeCompare`, buckets by
   `date.toISOString().slice(0,10)`, and parses with `new Date(...)`
   (`CartContents.tsx:17`). But the outlet API maps `eventDate` from a
   **human, venue-timezone display string** (`CombinedDateInVenueTimezone` in
   its `CartResponseExtensions`), which `new Date()` cannot reliably parse →
   `NaN`, broken sorting/grouping, and "Invalid Date" headers.

   **Fix — and mind the timezone (review refinement).** UTC is correct for
   _sorting_ but **wrong for day grouping**: an event at, say, 22:00 venue-local
   can fall on the next UTC day, so grouping purely by `eventStartAtUtc` buckets
   it under the wrong header. The contract therefore carries:
   - `eventStartAtUtc` (ISO 8601 UTC) — used for **ordering** only.
   - `eventDateKey` (venue-local `YYYY-MM-DD`) — used for **day grouping**.
     Equivalently, ship `eventStartAtLocalIso` + `eventTimeZone` and derive the
     key in core. Either way the day bucket must be venue-local, not UTC-derived.
   - `eventDateDisplay?` (optional pre-formatted string) — for rendering.

   The outlet API must add these machine fields; the website already returns
   ISO-compatible data and would add the venue-local key.

3. **`onNavigate` required** — `CartDrawer.tsx:127` currently does
   `onNavigate ?? (() => {})`, silently swallowing checkout. Make it required.

4. **`browseHref` + drop `LinkButton`** — covered in the dynamic-links audit
   (hardcoded `/collection/?id=` empty-state link; checkout button importing
   `next/link`). Route everything through `onNavigate`.

5. **`--cart-drawer-height` is an implicit _output_ coupling.** The drawer
   writes `--cart-drawer-height` onto `document.documentElement`
   (`CartDrawer.tsx:90-99`) and the host layout is expected to reserve bottom
   padding from it. Nothing passes/announces this — a consumer that doesn't
   read the var gets page content hidden behind the docked drawer.
   **Document it**, and offer an optional **`onHeightChange?(px)`** callback as
   a non-CSS-var alternative for the Vue/Razor host.

6. **Outlet app needs an explicit refresh after Add-to-Cart (NEW).** The
   outlet app's Add-to-Cart success handler only mutates **local Vue state**
   (`handleAddToCartSuccess` increments `collectionCartTicketCount` — no
   refetch). A drawer that fetched once would stay stale/hidden. **Fix:** expose
   a refresh seam — a `refreshKey` prop (bump to refetch), an imperative
   `refresh()`, or wire into the app's existing event bus. The website doesn't
   need this (React Query refetch-on-focus covers it).

7. **Outlet app host = same-origin `''` (CORRECTION, NEW).** An earlier example
   read the host from a `window.appConfig.outletHost`-style global. That field
   does **not** exist for the outlet app — its bootstrap `window` global holds
   event/inventory data, no cart host, and the cart API is **same-origin**. So
   the outlet app constructs the core client with `host: ''`. Only the website
   (cross-origin) injects a real host.

8. **Vue CSS import requires a Webpack change (NEW).** See the Styling section:
   `@oztix/roadie-cart/vue/style.css` will not import under the outlet app's
   current Webpack config (SCSS-only rules, `node_modules` excluded). Needs a
   `.css` rule (or SCSS-routed delivery). Not a no-op.

### NICE-TO-HAVE

9. **`onOpenChange?(open)` / optional controlled `open`.** The drawer is
   uncontrolled (`initialState` only) and never reports open/close. A host
   can't coordinate (analytics, close-on-route-change, mutual exclusion with
   other sheets). The website gets away with it via the CSS-var side effect.

10. **`onExpire?()`.** When the countdown hits 0 (`CartUrgencyBadge.tsx:32-34`)
    nothing tells the host to refetch/clear — the badge just floors at `0:00`.
    The website relies on React Query refetch-on-focus; the outlet app (plain
    fetch) has no such safety net, so an explicit expiry callback is safer.

11. **`onCheckoutClick?()`** — analytics seam. Tracking previously rode on
    `LinkButton`; since we drop it, either expose this or let the consumer key
    off `onNavigate(checkoutUrl)`. Low priority.

### Data-shape contract the drawer assumes

The drawer assumes these fields exist (core's response types make them
explicit; the API must honour them):

- `summary`: `ticketCount`, `cartTotal`, `expiresAtUtc`
- `details`: `extrasUrl`, `cartTotal`, `events[]`
- `event`: `eventId`, `eventName`, `venueName`, `imageUrl?` (absolute or
  correctly resolvable URL — see note), **`eventStartAtUtc`** (ISO 8601 UTC,
  for ordering), **`eventDateKey`** (venue-local `YYYY-MM-DD`, for day
  grouping — see finding #2), `eventDateDisplay?` (optional pre-formatted
  string), `bookingFees`, `total`, `tickets[]` `{ name, quantity, priceEach }`
- `expiresAtUtc` must be a `new Date()`-parseable ISO string.

> ⚠️ The current code keys off a field named `eventDate` and parses it with
> `new Date()`. The outlet API populates that from a venue-timezone _display_
> string, which does not parse reliably, and UTC alone groups near-midnight
> events under the wrong day. The contract standardises on `eventStartAtUtc`
> (ordering) + `eventDateKey` (venue-local grouping) — the outlet API must add
> them (finding #2).

> **Image URL contract (review correction #6):** a plain `<img src>` does _not_
> require CORS — CORS only matters if pixels are read (canvas/`getImageData`),
> which the drawer never does. The real requirement is simply that `imageUrl`
> is **absolute or otherwise correctly resolvable** from the consuming origin
> (a relative URL that only resolves inside the website would 404 elsewhere).

### SSR / hydration

All cart files are `'use client'` and touch `window` / `document` /
`visualViewport`. Fine for the Next.js React skin. The **Vue skin must mount
client-side only** — the outlet app server-renders via .NET Razor, so the drawer
cannot SSR; mount it after hydration.

## Styling — the Vue skin ships its own CSS

The React skin gets its look from Tailwind classes resolved against
`@oztix/roadie-core`. The outlet app has **no Tailwind** (SCSS + CSS
variables), so `@oztix/roadie-cart/vue` must **ship its own compiled CSS**
(`@oztix/roadie-cart/vue/style.css`) — built once at package-build time, scoped
to the drawer, themable via the CSS variables the app already defines.

⚠️ **Webpack is NOT untouched (review finding #8).** The outlet app's Webpack
config only has `.scss` rules and **excludes `node_modules`** from CSS
processing. Importing `@oztix/roadie-cart/vue/style.css` will fail as written.
One of the following is required:

- Add a `.css` module rule whose `include` covers the package's `dist`
  (smallest change — a few lines in the Webpack config), **or**
- Ship the styles as an importable `.scss` partial routed through the app's
  existing SCSS pipeline.

Either way, treat the consumer-side CSS wiring as an explicit implementation
task, not a no-op.

## Integration: what each app looks like

### Website (React / Next.js) — minimal change

Already uses `@tanstack/react-query`, `window.config`, and Next's router.

```tsx
import { createCartClient } from '@oztix/roadie-cart/core'
import { CartDrawer } from '@oztix/roadie-cart/react'
import '@oztix/roadie-core/css' // styling already wired app-wide

// set up the cart client once (e.g. a provider)
const config = useAppConfig()
const cart = createCartClient({
  host: config.outletHost,
  fetch: (url, init) => fetch(url, { ...init, credentials: 'include' }),
})

// where the drawer mounts (CartDrawerMount stays in the app)
const router = useRouter()
<CartDrawer
  cart={cart}
  collectionId={collectionId}
  onNavigate={(href) => router.push(href)}
  browseHref={buildCollectionUrl(collectionId)}
/>
```

Net change: a few imports + where the client is created. React Query and CSS
already in place.

### Outlet app (Vue 3, Options API, plain JS, Webpack)

```js
// Features/Shared/common.js — register globally, alongside modal/cart-timer
import { CartDrawer } from '@oztix/roadie-cart/vue'
import '@oztix/roadie-cart/vue/style.css'

app.component('cart-drawer', CartDrawer)
```

```js
// build the client with the app's own host/transport
import { createCartClient } from '@oztix/roadie-cart/core'

const cart = createCartClient({
  host: '' // outlet app is SAME-ORIGIN — the cart API is served from the
  // same host, so no host injection is needed (review finding #7).
  // (The website is cross-origin and DOES inject its outletHost.)
  // native fetch (Vue 3.5 / modern browsers) — keep axios for the rest of the app
})
```

> The outlet app's bootstrap data lives on a `window` global populated by the
> Razor view — it is event/inventory data and carries **no** cart host. Hence
> `host: ''`. Do not invent an `outletHost` field for this app.

```html
<!-- Razor-rendered view; Vue mounts client-side -->
<cart-drawer
  :cart="cart"
  :collection-id="collectionId"
  :on-navigate="navigate"
  :refresh-key="cartRefreshKey"
  browse-href="/events"
></cart-drawer>
```

```js
data() { return { cartRefreshKey: 0 } },
methods: {
  navigate(href) { window.location.assign(href) },   // full-page nav
  // The existing Add-to-Cart success handler only mutates local Vue state
  // (it increments a local ticket count, no refetch). The drawer fetched its
  // data once and would otherwise stay stale/hidden — so bump refreshKey here
  // to force the drawer to refetch (review finding #6).
  onAddedToCart() { this.cartRefreshKey++ }
}
```

## Files to extract / port (reference)

Core component files in the website today:
`CartDrawer.tsx`, `CartDrawerHandle.tsx`, `CartContents.tsx`,
`CartEmptyState.tsx`, `CartUrgencyBadge.tsx`, `useCartDrawerDrag.ts`,
`useCartBounce.ts`, `decideSnapTarget.ts`, plus `CartEventGroup.tsx`.

- Pure-logic pieces (`decideSnapTarget`, urgency-timer math, currency + date
  formatting, types, endpoint paths) → `src/core` (`@oztix/roadie-cart/core`).
- React UI → `src/react` (`@oztix/roadie-cart/react`) (rewire data to the core
  client, drop `LinkButton`, require `onNavigate`, accept `browseHref`).
- `CartDrawerMount`, `CartDevPanel` → stay in the website (not extracted).

## Build / publish

One package (`@oztix/roadie-cart`), one version. If/when published it goes
through Roadie's existing Changesets + public-npm flow (the `chore: version
packages` PR → merge → `pnpm changeset publish`); since this is a "move it
later" staging package, it can also stay `"private": true` and be consumed via
workspace link until the API settles. Build with `tsdown` (ESM) producing the
three subpath entries (`/core`, `/react`, `/vue`); the Vue entry additionally
emits a compiled `style.css`.

**Dependency surface — one `package.json`, framework deps optional (review
finding #4, verified against the website's `package.json`):**

- Core needs no framework deps.
- React entry: peers `react`, `react-dom`, `@oztix/roadie-components`,
  `@oztix/roadie-core`, plus cart-only **`motion`** (the _package_ is `motion`;
  `motion/react` is just the import path — the doc previously named this wrong),
  **`@number-flow/react`**, **`react-focus-lock`** (was missing — the focus
  trap depends on it).
- Vue entry: peers `vue`, a Vue focus-trap, an animation lib (see open
  questions).
- All framework peers are declared **`optional` via `peerDependenciesMeta`** so
  a React-only or Vue-only consumer gets no spurious peer warnings for the other
  framework's deps.

## Decisions

- **CI secret-guard: YES.** A test in `roadie-cart` core scans package source
  and **fails the build** on any hardcoded `http(s)://` domain or key-shaped
  literal (long base64/hex). This makes "no secrets" structurally enforced, not
  just documented.

## Testing strategy (high coverage is a goal)

Aim for thorough unit coverage, concentrated on the pure, framework-agnostic
core where bugs are cheapest to catch:

- **Secret-guard test** (above) — the source-scan guard itself.
- **`checkoutUrl` validation** — table-driven: accept `/path`; reject `//evil`,
  `http(s)://`, `javascript:`, `data:`, empty, and malformed `extrasUrl`.
- **Date/timezone grouping** — events near midnight UTC group under the correct
  **venue-local** day via `eventDateKey`; ordering uses `eventStartAtUtc`.
- **`decideSnapTarget` drag math** — position/velocity thresholds → open/closed.
- **Currency/date formatters** — `en-AU`/AUD vs a NZ/NZD locale render correctly
  (guards against the hardcoded-`$` regression).
- **Urgency-timer state machine** — success → warning (<5m) → danger (<2m) →
  expired (0), and the `onExpire` edge.
- **Cart client** — `getSummary`/`getDetails` build the right paths against an
  injected `host`/`fetch`; same-origin (`host:''`) and cross-origin both work.

Skin-level tests (React first, Vue when built) assert behaviour: `onNavigate`
fires with the validated checkout URL, `browseHref` is used for the empty
state, `refreshKey` triggers a refetch, `onOpenChange`/`onExpire` fire.

## Open questions (Vue-skin stage only — do not block core)

1. **Vue data layer** — `@tanstack/vue-query` (consistent with React, new dep
   for the outlet app) vs a plain composable (`ref` + `onMounted`, zero new deps)?
2. **Vue skin animations** — `motion/react` is React-only. The Vue skin needs
   an equivalent (`motion` vanilla, `@vueuse/motion`, or CSS). The drag _math_
   is shared via core; only the render-layer animation differs.
3. **Vue focus trap (review finding #5)** — `react-focus-lock` is React-only.
   The open drawer is a modal dialog and needs an equivalent focus trap in Vue
   (`focus-trap` / `focus-trap-vue`, or a small custom directive). Decide
   alongside the animation engine — both are render-layer concerns core does
   not cover.

## Out of scope (YAGNI)

- Cart mutations (add/remove) — the current drawer is read-only (Phase 1).
- A Lit/web-component variant.
- Migrating other cart UI (server-rendered `_CartSummary.cshtml`).
