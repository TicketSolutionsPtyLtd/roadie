import type { CartDetails, CartSummary } from './types'
import { buildCheckoutUrl } from './url'

export interface CartClientOptions {
  /** Base host. Empty string for same-origin. Never hardcode in this package. */
  host: string
  /** Injected transport. Defaults to global fetch. */
  fetch?: typeof fetch
}

export interface CartClient {
  getSummary(collectionId: string): Promise<CartSummary | null>
  getDetails(collectionId: string): Promise<CartDetails | null>
  checkoutUrl(details: Pick<CartDetails, 'extrasUrl'>): string | null
}

export function createCartClient(options: CartClientOptions): CartClient {
  const { host } = options
  const doFetch = options.fetch ?? globalThis.fetch

  async function get<T>(path: string): Promise<T | null> {
    const res = await doFetch(`${host}${path}`, { credentials: 'include' })
    if (!res.ok) return null
    return (await res.json()) as T
  }

  return {
    getSummary: (id) =>
      get<CartSummary>(
        `/outlet/api/collection/${encodeURIComponent(id)}/cart/summary`
      ),
    getDetails: (id) =>
      get<CartDetails>(`/outlet/api/collection/${encodeURIComponent(id)}/cart`),
    checkoutUrl: (details) => buildCheckoutUrl(host, details.extrasUrl)
  }
}
