# @oztix/roadie-widgets

## 3.0.0

### Major Changes

- 3142ef0: **Breaking (Vue skin):** the cart drawer's Vue skin now emits raw
  Roadie/Tailwind utility classes — the same ones the React skin uses — instead
  of shipping a self-contained, hand-authored `rc-` stylesheet. This makes
  core, React, and Vue share a single styling source of truth.

  The host **must** now provide the styles, exactly as every React Roadie
  consumer already does — run **Tailwind CSS v4** in the host build and, in the
  host's global CSS:

  ```css
  @import '@oztix/roadie-core/css';
  @source '../node_modules/@oztix/roadie-widgets/dist/cart-drawer/vue';
  ```

  That single import covers everything, animation included — the widget no longer
  ships a stylesheet of its own (the drawer's keyframes now live in Roadie core as
  `animate-nudge` / `animate-pop` / `motion-pop-in`).

  A host that loads neither Tailwind nor Roadie core CSS renders the drawer
  **unstyled**. Hosts that cannot run Tailwind v4 are not supported by `3.0.0`
  and should stay on `2.x`.

  **Migration:**
  - Remove `import '@oztix/roadie-widgets/cart-drawer/vue/style.css'` — the
    `./cart-drawer/vue/style.css` export has been **removed**. There is no
    replacement stylesheet to import; the keyframes ship from `@oztix/roadie-core/css`.
  - Add the Tailwind v4 + `@oztix/roadie-core/css` import + `@source` scan shown
    above.
  - The Vue skin now renders icons via `@phosphor-icons/vue`, added as a new
    **optional peer dependency** (`^2.2.0`). Install it in the host.

  The overlay blur changes from a hand-rolled `blur(2px)` to Roadie's
  `emphasis-overlay` (`blur(8px)`), and button heights align to Roadie's
  `btn-md` / `btn-sm` tiers to match what the React skin renders.

### Minor Changes

- 3142ef0: Cart drawer can now remove a whole event from the cart (both skins). The
  core client gains a `removeItem(cartId, eventId)` method that `POST`s to
  `.../events/{eventId}/remove` and refetches the cart, and each skin renders a
  remove-confirm popover on the event row so the action is a deliberate,
  two-step interaction. This new core surface is what justifies the
  `cart-drawer/core` size-limit budget.

### Patch Changes

- 0ba959a: Add a `z-alert` layering tier and let `Dialog` pick its z-index from the ARIA `role`.
  - **core**: new `--z-index-alert` (80) tier above `tooltip`, for blocking alert dialogs that must stack over an open modal or drawer.
  - **components**: `Dialog.Root` accepts `role='dialog' | 'alertdialog'` (default `dialog`). `alertdialog` sets `role="alertdialog"` on the surface and raises the backdrop + surface to `z-alert`.
  - **widgets**: cart-drawer expiry modal uses `role='alertdialog'`; cart-drawer layering migrated to named z-index tiers and footer shadow tinted via `--intent-hue`.

- Updated dependencies [82ae89b]
- Updated dependencies [0ba959a]
  - @oztix/roadie-core@2.3.0
  - @oztix/roadie-components@2.9.0

## 2.0.1

### Patch Changes

- Updated dependencies [2a43e97]
  - @oztix/roadie-core@2.2.0
  - @oztix/roadie-components@2.7.0

## 2.0.0

### Major Changes

- **Breaking:** `CartDrawer` is now presentation-only for expiry. It keeps the
  countdown pill and the `onExpire` signal, but no longer renders the expiry
  modals or hides itself when the cart expires — that is now the host's
  responsibility. This lets the host own the blocking/expired UX (and keep it
  mounted after the drawer is gone).

  `CartExpiryModals` and `useCartExpiry` (+ their types) are now exported from
  each skin's barrel as standalone pieces so the host can mount and drive them.

  Migration — read the hold's `expiresAtUtc` yourself, drive `useCartExpiry`,
  render `CartExpiryModals`, and drop the drawer once `expired` is true:

  ```tsx
  // React
  const { remaining, expired, showWarning, dismissWarning } =
    useCartExpiry(expiresAtUtc)

  return (
    <>
      {!expired && <CartDrawer cart={cart} collectionId={id} onNavigate={nav} />}
      <CartExpiryModals
        showWarning={showWarning}
        expired={expired}
        remaining={remaining}
        onDismissWarning={dismissWarning}
        checkoutUrl={checkoutUrl}
        browseHref={browseHref}
        onNavigate={nav}
      />
    </>
  )
  ```

  The Vue skin mirrors this with a `useCartExpiry` composable and the
  `CartExpiryModals.vue` component exported from `cart-drawer/vue`.

### Minor Changes

- 008f472: Surface booking fees in the `CartDrawer` footer (both skins). The fees line now
  reads **"Incl. $X booking fees. Delivery and refund protection calculated at
  checkout"** when the cart carries booking fees, falling back to **"Includes
  booking fees. Delivery and refund protection calculated at checkout"** when
  there are none — matching the full `CartContents` footer.

  The figure is summed client-side from the FRESH per-event `bookingFees` field on
  the `/cart` details payload (server: `item.InventoryBookingFee()`), via a new
  `deriveBookingFees` core helper. Like `deriveCartTotal`, it reads the computed
  per-event value rather than the stored, lag-prone cart total, so the fees line
  tracks the cart reactively. No new props are required by consumers — the drawer
  derives and renders the line automatically.

- cdf813f: Add a `context: 'collection' | 'event'` prop to `CartDrawer` (both skins) that
  drives the open-state secondary button. The button is now **"View cart"**
  (closed) / **"Browse events"** (open):
  - `context: 'event'` — "Browse events" navigates to the collection page so the
    user can browse more events.
  - `context: 'collection'` (default) — "Browse events" just closes the drawer
    (the collection page is already behind it).

  The browse target is built **inside the package** from the server-trusted
  `collectionId` (`buildBrowseHref` → validated by `isSafeRelativePath`) and routed
  through `onNavigate`. We deliberately don't accept a consumer-supplied browse URL
  or navigate callback: a tainted value (e.g. a `redirect=` query param) could turn
  "Browse events" into an open redirect, whereas internal construction guarantees
  `onNavigate` only ever receives a same-origin, collectionId-derived path.

  Backward-compatible: omitting `context` defaults to `'collection'`, preserving
  the prior close-on-secondary-button behaviour (only the label changes).

### Patch Changes

- 2355fc8: Stop the cart-drawer grabber painting a focus ring (a circle at the top) when
  the drawer is opened by drag or click. The focus trap now targets the dialog
  container (`tabindex="-1"`, no outline) on open instead of the first tabbable
  element (the drag grabber), matching the standard ARIA-dialog focus pattern.
  Keyboard users still tab to the grabber and see its `:focus-visible` ring, so
  accessibility is preserved.

## 1.3.0

### Minor Changes

- 8c8214f: Cart drawer — Website visual + theme parity across both skins.

  **Theming (both skins now themeable like the Website):**
  - The Vue skin's `--rc-*` colour tokens bridge to roadie-core ambient tokens
    (`var(--background-color-raised, …)`, `var(--color-accent-9, …)`, etc.), so
    the drawer inherits the collection accent (via `--accent-hue`) and dark mode
    (roadie tokens swap under `.dark`) — matching the React skin, which already
    inherits via roadie utility classes.
  - New `useRoadieTheme(accentColor)` Vue composable mirrors React's
    `ThemeProvider`: derives OKLCH hue/chroma from a hex and writes
    `--accent-hue`/`--accent-chroma` to `:root`, so a Vue app can apply a
    collection theme the same way the Website does. Reuses core's sync OKLCH
    helpers — no new dependency.

  **Visual parity (both skins):**
  - Mobile shell morph — full-bleed flush-bottom with top-only rounding on
    mobile, floating card from `sm` up (was always floating).
  - Spacing aligned to the Website (outer/section/ticket gaps); React drops a
    redundant wrapper and gains an opt-in `roundedDayHeaders` prop.
  - Vue footer now has the progress-driven lift shadow the React skin already had.
  - Centered empty state (icon, heading, prose) on both skins.
  - Vue motion (`bounce`/`pop`) gated behind `prefers-reduced-motion`.

### Patch Changes

- 1e54981: Fix the Vue `CartDrawer` freezing the tab when the drawer is dragged. The
  header/footer measurement setters ran on every re-render (Vue re-invokes
  template ref callbacks each render), tearing down and re-observing their
  `ResizeObserver`; each re-observe fired the callback, whose deferred write
  scheduled another render → re-observe → a cross-frame loop that pinned the main
  thread. It surfaced as a hard tab freeze with no console error (one render per
  tick never trips Vue's in-tick recursion guard), and was worst during a drag
  because `dragHeight` re-renders on every pointermove.

  `createHeightTracker.setElement` is now idempotent — it (re)observes only when a
  genuinely new element arrives and no-ops on same-element / transient-null
  re-invocations (real teardown stays in `onScopeDispose`). The header/footer ref
  callbacks are also hoisted to stable identities. Adds a regression test
  asserting the observer is not re-attached across re-renders.

## 1.2.2

### Patch Changes

- a5c525f: `groupEventsByDay` no longer throws when a cart event is missing its
  `eventStartAtUtc` (ordering key) or `eventDateKey` (grouping key). Previously a
  single undefined key crashed the `.localeCompare` sort, which — because it runs
  inside the `CartContents` render — blanked the entire cart list (and surfaced as
  `TypeError: Cannot read properties of undefined (reading 'localeCompare')`).

  The grouping now coerces absent keys defensively (consistent with the package's
  untrusted-payload trust seam): every item still renders, dated events keep their
  correct order/grouping, and any undated events trail in a final group rather
  than taking down the whole drawer. Date headers/times for undated events fall
  back to empty via the existing render-layer guards.

  Note: this is defence-in-depth. Correct ordering/day-grouping still requires the
  consuming app to supply `eventStartAtUtc` + `eventDateKey` on each event.

## 1.2.1

### Patch Changes

- 77885bc: Fix `ResizeObserver loop completed with undelivered notifications` warning in
  the cart-drawer drag composable. Header/footer height measurements taken
  inside the observer callback now schedule their state writes via
  `requestAnimationFrame`, so the observer no longer dispatches a fresh layout
  synchronously within its own callback frame.

## 1.2.0

### Minor Changes

- 7ab119d: `CartDrawer` (Vue + React) now builds the empty-state "Browse" target itself
  from the trusted `collectionId` via a new `buildBrowseHref` core helper, so
  consumers don't have to thread a request-param-derived value through to the
  navigation sink. `browseHref` is now an optional prop — when omitted (or when
  the supplied value fails `isSafeRelativePath`) the package builds the default:

  ```
  /collection/cart/?id={collectionId}&redirect={current path+search}
  ```

  This closes a class of `window.location.href` open-redirect findings (e.g.
  Aikido) in consumer apps where a request-param-derived `browseHref` could
  slip past server-side validation (a backslash-prefixed path like
  `/\evil.com` is accepted as "relative" by .NET's `Uri.TryCreate`, but the
  browser normalises it to a cross-origin redirect). The package now owns the
  URL pattern; consumer apps drop `browseHref` from their drawer config.

  Backward-compatible: existing consumers passing a `browseHref` keep working,
  and unsafe values are sanitised by falling back to the built default.

## 1.1.0

### Minor Changes

- `CartDrawer` (Vue + React) now builds the empty-state "Browse" target itself
  from the trusted `collectionId` via a new `buildBrowseHref` core helper, so
  consumers don't have to thread a request-param-derived value through to the
  navigation sink. `browseHref` is now an optional prop — when omitted (or when
  the supplied value fails `isSafeRelativePath`) the package builds the default:

  ```
  /collection/cart/?id={collectionId}&redirect={current path+search}
  ```

  This closes a class of `window.location.href` open-redirect findings (e.g.
  Aikido) in consumer apps where a request-param-derived `browseHref` could
  slip past server-side validation (a backslash-prefixed path like
  `/\evil.com` is accepted as "relative" by .NET's `Uri.TryCreate`, but the
  browser normalises it to a cross-origin redirect). The package now owns the
  URL pattern; consumer apps drop `browseHref` from their drawer config.

  Backward-compatible: existing consumers passing a `browseHref` keep working,
  and unsafe values are sanitised by falling back to the built default.

## 1.0.0

### Major Changes

- 6faf317: First stable release. Re-publish with a clean manifest: the `workspace:*`
  dependency ranges (`@oztix/roadie-core`, `@oztix/roadie-components`) are now
  rewritten to concrete semver ranges at publish time, so the package installs
  cleanly outside the monorepo. The previously published `0.1.0` leaked the raw
  `workspace:*` protocol and failed to resolve for external consumers.

## 0.1.0

### Minor Changes

- b0d8b40: Initial release. `@oztix/roadie-widgets` debuts with a shared cart drawer
  extracted from the Oztix website into a framework-agnostic package:
  - `cart-drawer/core` — BYOF transport client, drag math, urgency state
    machine, currency/date formatting, URL validation.
  - `cart-drawer/react` — React 19 skin.
  - `cart-drawer/vue` — Vue 3 SFC skin plus compiled stylesheet at
    `cart-drawer/vue/style.css` for Webpack/SCSS consumers without Tailwind.

  API is pre-1.0; expect breaking changes.
