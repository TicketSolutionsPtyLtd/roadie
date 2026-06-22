import type { CartClient } from '../../cart'

/** Props for the Vue `CartDrawer` SFC. Exported so consumers can type wrappers. */
export type CartDrawerProps = {
  /** Core cart client (host + fetch injected by the consuming app). */
  cart: CartClient
  collectionId: string
  /** REQUIRED — routing is the consumer's job. No silent no-op fallback. */
  onNavigate: (href: string) => void
  /**
   * Empty-state "Browse" target. Optional — when omitted, `CartDrawer` builds
   * a safe default from `collectionId` via `buildBrowseHref` (see
   * `core/url.ts`). Pass this only if you need to override the default
   * collection-cart route. Unsafe values (failing `isSafeRelativePath`) fall
   * back to the built default so the navigation sink stays safe.
   */
  browseHref?: string
  /**
   * Where the drawer is mounted — decides what the open-state secondary button
   * ("Browse events") does:
   *   - `'event'`      → navigate to the collection page to browse more events.
   *   - `'collection'` → just close the drawer (the collection page is already
   *                      behind it). Default.
   *
   * WHY an enum + internal URL (and NOT a consumer `onBrowse`/href callback):
   * security. The browse target is built by the PACKAGE from the server-trusted
   * `collectionId` (via `buildBrowseHref`, validated by `isSafeRelativePath`) and
   * routed through `onNavigate`. If the consumer supplied the URL or the
   * navigation, a tainted value (e.g. a `redirect=` query param) could turn
   * "Browse events" into an open redirect. Keeping construction inside the
   * package removes that surface: `onNavigate` only ever receives a same-origin,
   * collectionId-derived path. The enum also names the two supported contexts
   * explicitly and leaves room to add more later.
   */
  context?: 'collection' | 'event'
  /** Locale for currency/date formatting (design finding #1). */
  locale: string
  /** ISO 4217 currency code (design finding #1). */
  currency: string
  /** Bump to force a refetch of summary + details (design finding #6). */
  refreshKey?: number
  /** Lock body scroll while open. Default true. */
  lockBodyScroll?: boolean
  /**
   * Controlled open state — supports `v-model:open`. When provided, the drawer
   * animates to match it, so any UI (e.g. a "View cart" button) can open/close
   * it. Omit for uncontrolled (tap/drag) behaviour seeded by `initialState`.
   */
  open?: boolean
  /** Uncontrolled initial state when `open` is omitted. Default 'closed'. */
  initialState?: 'closed' | 'open'
  /** Fires on every open/close intent (tap, drag, Escape, backdrop, or `open`). */
  onOpenChange?: (open: boolean) => void
  /** Fires when the urgency countdown hits expiry (design finding #10). */
  onExpire?: () => void
  /** Reports the docked (closed) drawer height in px — a non-CSS-var
   * alternative to the `--cart-drawer-height` documentElement side effect
   * (design finding #5). */
  onHeightChange?: (px: number) => void
}
