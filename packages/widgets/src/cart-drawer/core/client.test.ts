import { describe, expect, it, vi } from 'vitest'

import { createCartClient } from './client'
import type { CartDetails } from './types'

const okFetch = (body: unknown) =>
  vi.fn(async () => ({ ok: true, json: async () => body }) as Response)

const details = (extrasUrl: string): CartDetails => ({
  cartId: 'c',
  collectionName: null,
  logoUrl: null,
  cartTotal: 0,
  expiresAtUtc: 'x',
  extrasUrl,
  events: []
})

describe('createCartClient', () => {
  it('builds the summary path against the injected host', async () => {
    const fetchMock = okFetch({
      cartId: 'c',
      ticketCount: 1,
      cartTotal: 10,
      expiresAtUtc: 'x',
      eventIds: []
    })
    const cart = createCartClient({
      host: 'https://h.example',
      fetch: fetchMock
    })
    await cart.getSummary('col-1')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://h.example/outlet/api/collection/col-1/cart/summary',
      expect.anything()
    )
  })

  it('works same-origin with empty host', async () => {
    const fetchMock = okFetch({ events: [] })
    const cart = createCartClient({ host: '', fetch: fetchMock })
    await cart.getDetails('col-1')
    expect(fetchMock).toHaveBeenCalledWith(
      '/outlet/api/collection/col-1/cart',
      expect.anything()
    )
  })

  it('encodes the collectionId', async () => {
    const fetchMock = okFetch({})
    const cart = createCartClient({ host: '', fetch: fetchMock })
    await cart.getSummary('a/b')
    expect(fetchMock).toHaveBeenCalledWith(
      '/outlet/api/collection/a%2Fb/cart/summary',
      expect.anything()
    )
  })

  it('sends credentials include', async () => {
    const fetchMock = okFetch({})
    const cart = createCartClient({ host: '', fetch: fetchMock })
    await cart.getSummary('c')
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ credentials: 'include' })
    )
  })

  it('checkoutUrl delegates to safe builder', () => {
    const cart = createCartClient({ host: 'https://h.example' })
    expect(cart.checkoutUrl(details('/outlet/extras/x'))).toBe(
      'https://h.example/outlet/extras/x'
    )
    expect(cart.checkoutUrl(details('https://evil.com'))).toBeNull()
  })

  it('normalises a trailing slash on the host (no //path)', async () => {
    const fetchMock = okFetch({ cartId: 'c' })
    const cart = createCartClient({
      host: 'https://h.example/',
      fetch: fetchMock
    })
    await cart.getSummary('col-1')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://h.example/outlet/api/collection/col-1/cart/summary',
      expect.anything()
    )
  })

  it('returns null on non-ok response', async () => {
    const fetchMock = vi.fn(async () => ({ ok: false }) as Response)
    const cart = createCartClient({ host: '', fetch: fetchMock })
    expect(await cart.getSummary('c')).toBeNull()
  })

  it('returns null when the payload is not a cart-shaped object', async () => {
    for (const bad of [[], 'nope', 42, null, true]) {
      const cart = createCartClient({
        host: '',
        fetch: vi.fn(
          async () => ({ ok: true, json: async () => bad }) as Response
        )
      })
      expect(await cart.getSummary('c')).toBeNull()
      expect(await cart.getDetails('c')).toBeNull()
    }
  })
})
