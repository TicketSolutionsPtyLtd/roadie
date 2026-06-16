import type { ReactNode } from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { CartClient, CartDetails, CartSummary } from '../core'
import { useCartDetails, useCartSummary } from './useCart'

const summary: CartSummary = {
  cartId: 'c1',
  ticketCount: 2,
  cartTotal: 50,
  expiresAtUtc: '2026-06-15T00:10:00Z',
  eventIds: ['e1']
}

const details: CartDetails = {
  cartId: 'c1',
  collectionName: 'Festival',
  logoUrl: null,
  cartTotal: 50,
  expiresAtUtc: '2026-06-15T00:10:00Z',
  extrasUrl: '/outlet/extras/c1',
  events: []
}

function mockClient(over: Partial<CartClient> = {}): CartClient {
  return {
    getSummary: vi.fn(async () => summary),
    getDetails: vi.fn(async () => details),
    checkoutUrl: vi.fn(() => '/outlet/extras/c1'),
    removeItem: vi.fn(async () => {}),
    ...over
  }
}

function wrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

describe('useCartSummary', () => {
  it('fetches the summary from the core client', async () => {
    const cart = mockClient()
    const { result } = renderHook(() => useCartSummary(cart, 'col-1'), {
      wrapper: wrapper()
    })
    await waitFor(() => expect(result.current.data).toEqual(summary))
    expect(cart.getSummary).toHaveBeenCalledWith('col-1')
  })

  it('refetches when refreshKey is bumped', async () => {
    const cart = mockClient()
    const Wrapper = wrapper()
    const { result, rerender } = renderHook(
      ({ key }: { key: number }) => useCartSummary(cart, 'col-1', key),
      { wrapper: Wrapper, initialProps: { key: 0 } }
    )
    await waitFor(() => expect(result.current.data).toEqual(summary))
    expect(cart.getSummary).toHaveBeenCalledTimes(1)

    rerender({ key: 1 })
    await waitFor(() => expect(cart.getSummary).toHaveBeenCalledTimes(2))
  })
})

describe('useCartDetails', () => {
  it('fetches details from the core client', async () => {
    const cart = mockClient()
    const { result } = renderHook(() => useCartDetails(cart, 'col-1'), {
      wrapper: wrapper()
    })
    await waitFor(() => expect(result.current.data).toEqual(details))
    expect(cart.getDetails).toHaveBeenCalledWith('col-1')
  })

  it('refetches details when refreshKey is bumped', async () => {
    const cart = mockClient()
    const Wrapper = wrapper()
    const { result, rerender } = renderHook(
      ({ key }: { key: number }) => useCartDetails(cart, 'col-1', key),
      { wrapper: Wrapper, initialProps: { key: 0 } }
    )
    await waitFor(() => expect(result.current.data).toEqual(details))
    expect(cart.getDetails).toHaveBeenCalledTimes(1)

    rerender({ key: 1 })
    await waitFor(() => expect(cart.getDetails).toHaveBeenCalledTimes(2))
  })
})
