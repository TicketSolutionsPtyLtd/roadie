'use client'

import { useQuery, type UseQueryResult } from '@tanstack/react-query'

import type { CartClient, CartDetails, CartSummary } from '../core'

/**
 * Fetch the cart summary via the injected core client. `refreshKey` is folded
 * into the query key so bumping it forces a refetch (design finding #6 — the
 * Vue/outlet app has no refetch-on-focus safety net).
 */
export function useCartSummary(
  cart: CartClient,
  collectionId: string,
  refreshKey?: number
): UseQueryResult<CartSummary | null> {
  return useQuery({
    queryKey: ['roadieCartSummary', collectionId, refreshKey],
    queryFn: () => cart.getSummary(collectionId),
    staleTime: 0
  })
}

/** Fetch the cart details via the injected core client. See `useCartSummary`. */
export function useCartDetails(
  cart: CartClient,
  collectionId: string,
  refreshKey?: number
): UseQueryResult<CartDetails | null> {
  return useQuery({
    queryKey: ['roadieCartDetails', collectionId, refreshKey],
    queryFn: () => cart.getDetails(collectionId),
    staleTime: 0
  })
}
