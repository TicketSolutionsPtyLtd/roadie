import { render } from '@testing-library/vue'
import { flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'

import type { CartClient, CartDetails, CartSummary } from '../core'
import { buildCheckoutUrl } from '../core'
import { useCart } from './useCart'

const HOST = 'https://h.example'

function makeSummary(over: Partial<CartSummary> = {}): CartSummary {
  return {
    cartId: 'c1',
    ticketCount: 2,
    cartTotal: 50,
    expiresAtUtc: new Date(Date.now() + 600000).toISOString(),
    eventIds: ['e1'],
    ...over
  }
}

function makeDetails(over: Partial<CartDetails> = {}): CartDetails {
  return {
    cartId: 'c1',
    collectionName: 'Festival',
    logoUrl: null,
    cartTotal: 50,
    expiresAtUtc: new Date(Date.now() + 600000).toISOString(),
    extrasUrl: '/outlet/extras/c1',
    events: [],
    ...over
  }
}

function mockCart(over: Partial<CartClient> = {}): CartClient {
  return {
    getSummary: vi.fn(async () => makeSummary()),
    getDetails: vi.fn(async () => makeDetails()),
    checkoutUrl: (details) => buildCheckoutUrl(HOST, details.extrasUrl),
    removeItem: vi.fn(async () => {}),
    ...over
  }
}

/** Mount a throwaway component that runs the composable so onMounted fires. */
function mountComposable(
  cart: CartClient,
  collectionId: string,
  refreshKey: ReturnType<typeof ref<number | undefined>>
) {
  const result: { value: ReturnType<typeof useCart> | null } = { value: null }
  const Comp = defineComponent({
    setup() {
      result.value = useCart(
        cart,
        () => collectionId,
        () => refreshKey.value
      )
      return () => h('div')
    }
  })
  render(Comp)
  return result
}

describe('useCart', () => {
  it('fetches summary + details on mount', async () => {
    const cart = mockCart()
    const refreshKey = ref<number | undefined>(undefined)
    const r = mountComposable(cart, 'col-1', refreshKey)
    await flushPromises()
    expect(cart.getSummary).toHaveBeenCalledWith('col-1')
    expect(cart.getDetails).toHaveBeenCalledWith('col-1')
    expect(r.value?.summary.value?.ticketCount).toBe(2)
    expect(r.value?.details.value?.cartId).toBe('c1')
  })

  it('refetches when refreshKey changes', async () => {
    const cart = mockCart()
    const refreshKey = ref<number | undefined>(0)
    mountComposable(cart, 'col-1', refreshKey)
    await flushPromises()
    expect(cart.getSummary).toHaveBeenCalledTimes(1)

    refreshKey.value = 1
    await nextTick()
    await flushPromises()
    expect(cart.getSummary).toHaveBeenCalledTimes(2)
  })

  it('surfaces loading + clears it after the fetch resolves', async () => {
    const cart = mockCart()
    const refreshKey = ref<number | undefined>(undefined)
    const r = mountComposable(cart, 'col-1', refreshKey)
    expect(r.value?.detailsLoading.value).toBe(true)
    await flushPromises()
    expect(r.value?.detailsLoading.value).toBe(false)
  })

  it('discards a stale refresh whose response resolves after a newer one', async () => {
    const resolvers: Array<(s: CartSummary) => void> = []
    let call = 0
    const cart = mockCart({
      getSummary: vi.fn(
        () =>
          new Promise<CartSummary>((resolve) => {
            resolvers[call++] = resolve
          })
      )
    })
    const refreshKey = ref<number | undefined>(0)
    const r = mountComposable(cart, 'col-1', refreshKey)
    await nextTick()
    await flushPromises() // first refresh issued (call 0 pending)

    refreshKey.value = 1
    await nextTick()
    await flushPromises() // second refresh issued (call 1 pending)

    const [resolveStale, resolveNewest] = resolvers
    if (!resolveStale || !resolveNewest)
      throw new Error('resolvers not captured')
    // Resolve the NEWEST request first, then the stale one. The stale
    // (call 0) response must not clobber the newer (call 1) state.
    resolveNewest(makeSummary({ ticketCount: 2 }))
    await flushPromises()
    resolveStale(makeSummary({ ticketCount: 1 }))
    await flushPromises()

    expect(r.value?.summary.value?.ticketCount).toBe(2)
  })

  it('clears loading (no infinite skeletons) when collectionId is empty', async () => {
    const cart = mockCart()
    const refreshKey = ref<number | undefined>(undefined)
    const r = mountComposable(cart, '', refreshKey)
    await flushPromises()
    expect(r.value?.summaryLoading.value).toBe(false)
    expect(r.value?.detailsLoading.value).toBe(false)
    expect(cart.getSummary).not.toHaveBeenCalled()
  })

  it('captures a details error without throwing', async () => {
    const cart = mockCart({
      getDetails: vi.fn(async () => {
        throw new Error('boom')
      })
    })
    const refreshKey = ref<number | undefined>(undefined)
    const r = mountComposable(cart, 'col-1', refreshKey)
    await flushPromises()
    expect(r.value?.detailsError.value).toBeInstanceOf(Error)
  })
})
