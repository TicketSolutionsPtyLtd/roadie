import type { CartClient } from '../core'

/** Props for the Vue `CartDrawer` SFC. Exported so consumers can type wrappers. */
export type CartDrawerProps = {
  /** Core cart client (host + fetch injected by the consuming app). */
  cart: CartClient
  collectionId: string
  /** REQUIRED — routing is the consumer's job. No silent no-op fallback. */
  onNavigate: (href: string) => void
  /** App-specific browse target for the empty state (design finding #4). */
  browseHref: string
  /** Locale for currency/date formatting (design finding #1). */
  locale: string
  /** ISO 4217 currency code (design finding #1). */
  currency: string
  /** Bump to force a refetch of summary + details (design finding #6). */
  refreshKey?: number
  /** Lock body scroll while open. Default true. */
  lockBodyScroll?: boolean
  /** Uncontrolled initial state. Default 'closed'. */
  initialState?: 'closed' | 'open'
  /** Fires on open/close transitions (design finding #9). */
  onOpenChange?: (open: boolean) => void
  /** Fires when the urgency countdown hits expiry (design finding #10). */
  onExpire?: () => void
  /** Reports the docked (closed) drawer height in px — a non-CSS-var
   * alternative to the `--cart-drawer-height` documentElement side effect
   * (design finding #5). */
  onHeightChange?: (px: number) => void
}
