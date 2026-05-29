# @oztix/roadie-widgets

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
