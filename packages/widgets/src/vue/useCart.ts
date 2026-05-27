import { type Ref, onMounted, shallowRef, watch } from 'vue'

import type { CartClient, CartDetails, CartSummary } from '../core'

export interface UseCartReturn {
  summary: Ref<CartSummary | null>
  details: Ref<CartDetails | null>
  summaryLoading: Ref<boolean>
  detailsLoading: Ref<boolean>
  summaryError: Ref<unknown>
  detailsError: Ref<unknown>
  /** Imperatively refetch summary + details (also runs on mount + refreshKey change). */
  refresh: () => Promise<void>
}

/**
 * Plain Vue composable over the framework-agnostic core client — no
 * `@tanstack/vue-query`, zero new runtime deps for the outlet app. Fetches on
 * mount and refetches whenever `collectionId` or `refreshKey` changes (design
 * finding #6 — the outlet app has no refetch-on-focus safety net, so bumping
 * `refreshKey` is the refresh seam). Getters keep the inputs reactive without
 * forcing the caller to pass refs.
 */
export function useCart(
  cart: CartClient,
  collectionId: () => string,
  refreshKey: () => number | undefined
): UseCartReturn {
  const summary = shallowRef<CartSummary | null>(null)
  const details = shallowRef<CartDetails | null>(null)
  const summaryLoading = shallowRef(true)
  const detailsLoading = shallowRef(true)
  const summaryError = shallowRef<unknown>(null)
  const detailsError = shallowRef<unknown>(null)

  async function refresh(): Promise<void> {
    const id = collectionId()
    if (!id) return
    summaryLoading.value = true
    detailsLoading.value = true
    summaryError.value = null
    detailsError.value = null
    await Promise.all([
      (async () => {
        try {
          summary.value = await cart.getSummary(id)
        } catch (err) {
          summaryError.value = err
        } finally {
          summaryLoading.value = false
        }
      })(),
      (async () => {
        try {
          details.value = await cart.getDetails(id)
        } catch (err) {
          detailsError.value = err
        } finally {
          detailsLoading.value = false
        }
      })()
    ])
  }

  onMounted(refresh)
  // Refetch on collectionId / refreshKey change (skip the mount duplicate via
  // onMounted handling the initial load; watch fires only on subsequent change).
  watch([() => collectionId(), () => refreshKey()], refresh)

  return {
    summary,
    details,
    summaryLoading,
    detailsLoading,
    summaryError,
    detailsError,
    refresh
  }
}
