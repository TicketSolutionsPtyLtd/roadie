import type { CartDetails, CartSummary } from './types'
import { buildCheckoutUrl } from './url'

export type CartClientOptions = {
  /** Base host. Empty string for same-origin. */
  host: string
  /** Injected transport. Defaults to global fetch. */
  fetch?: typeof fetch
}

export interface CartClient {
  getSummary(collectionId: string): Promise<CartSummary | null>
  getDetails(collectionId: string): Promise<CartDetails | null>
  checkoutUrl(details: Pick<CartDetails, 'extrasUrl'>): string | null
  /** Remove an entire event from the cart; refetch to reflect the new cart. */
  removeItem(cartId: string, eventId: string): Promise<void>
}

export function createCartClient(options: CartClientOptions): CartClient {
  // Manual trailing-slash trim (not a `/\/+$/` regex) avoids ReDoS and `//` paths.
  let host = options.host
  while (host.endsWith('/')) host = host.slice(0, -1)
  const doFetch = options.fetch ?? globalThis.fetch

  async function get<T>(path: string): Promise<T | null> {
    const res = await doFetch(`${host}${path}`, { credentials: 'include' })
    if (!res.ok) return null
    const data: unknown = await res.json()
    // Untrusted response: assert coarse shape; sink values validated at point of use.
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return null
    }
    return data as T
  }

  // Bodyless POST for cart writes; throw on non-2xx so a failed write can't silently desync.
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
    removeItem: (cartId, eventId) =>
      post(
        `/outlet/api/carts/${encodeURIComponent(cartId)}/events/${encodeURIComponent(eventId)}/remove`
      )
  }
}
