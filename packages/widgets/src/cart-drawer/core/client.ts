import type { CartDetails, CartSummary } from './types'
import { buildCheckoutUrl } from './url'

export type CartClientOptions = {
  /** Base host. Empty string for same-origin. Never hardcode in this package. */
  host: string
  /** Injected transport. Defaults to global fetch. */
  fetch?: typeof fetch
}

export interface CartClient {
  getSummary(collectionId: string): Promise<CartSummary | null>
  getDetails(collectionId: string): Promise<CartDetails | null>
  checkoutUrl(details: Pick<CartDetails, 'extrasUrl'>): string | null
  /**
   * Remove an entire event (all its ticket lines) from the cart. Backend
   * `RemoveCartItems` returns 204 and no body, so this resolves to void —
   * callers must refetch `getDetails`/`getSummary` to reflect the new cart.
   * Rejects on any non-2xx so the caller can unlock + surface an error.
   */
  removeItem(cartId: string, eventId: string): Promise<void>
}

export function createCartClient(options: CartClientOptions): CartClient {
  // Strip trailing slashes so `${host}${path}` (path always starts with "/")
  // can't produce `https://h.example//outlet/...` — some CDNs route `//` paths
  // differently. Empty host (same-origin) stays empty. A manual trim (not a
  // `/\/+$/` regex) sidesteps the polynomial-backtracking ReDoS that pattern
  // triggers on inputs with many trailing slashes.
  let host = options.host
  while (host.endsWith('/')) host = host.slice(0, -1)
  const doFetch = options.fetch ?? globalThis.fetch

  async function get<T>(path: string): Promise<T | null> {
    const res = await doFetch(`${host}${path}`, { credentials: 'include' })
    if (!res.ok) return null
    const data: unknown = await res.json()
    // Explicit trust seam: the response is untrusted. Assert the coarse shape
    // (a non-null, non-array object) here; field values that reach sinks are
    // validated at point of use (extrasUrl → isSafeRelativePath, imageUrl →
    // isSafeImageUrl). A non-object payload can't be a cart, so treat it as a
    // failed fetch rather than handing `as T` a lie.
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return null
    }
    return data as T
  }

  // POST mutation with no body, used for cart writes. The remove endpoint
  // returns 204; any non-2xx is a real failure the caller must observe, so
  // throw rather than swallow (mirrors the read seam's "untrusted" posture but
  // surfaces errors instead of returning null, since a write that silently
  // "succeeds" would desync the drawer).
  async function post(path: string): Promise<void> {
    const res = await doFetch(`${host}${path}`, {
      method: 'POST',
      credentials: 'include'
    })
    if (!res.ok) throw new Error(`Cart request failed (${res.status})`)
  }

  return {
    getSummary: (id) =>
      get<CartSummary>(
        `/outlet/api/collection/${encodeURIComponent(id)}/cart/summary`
      ),
    getDetails: (id) =>
      get<CartDetails>(`/outlet/api/collection/${encodeURIComponent(id)}/cart`),
    checkoutUrl: (details) => buildCheckoutUrl(host, details.extrasUrl),
    // Event-scoped remove — deletes ALL ticket lines for the event (backend
    // RemoveCartItems). Path built internally; consumer still injects host only.
    removeItem: (cartId, eventId) =>
      post(
        `/outlet/api/carts/${encodeURIComponent(cartId)}/events/${encodeURIComponent(eventId)}/remove`
      )
  }
}
