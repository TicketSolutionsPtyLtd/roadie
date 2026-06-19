import { type Ref, onMounted, shallowRef, watch } from 'vue'

import type { CartClient, CartDetails, CartSummary } from '../../cart'

export type UseCartReturn = {
  summary: Ref<CartSummary | null>
  details: Ref<CartDetails | null>
  summaryLoading: Ref<boolean>
  detailsLoading: Ref<boolean>
  summaryError: Ref<Error | null>
  detailsError: Ref<Error | null>
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
  const summaryError = shallowRef<Error | null>(null)
  const detailsError = shallowRef<Error | null>(null)

  const asError = (err: unknown): Error =>
    err instanceof Error ? err : new Error(String(err))

  // Monotonic request token. Each refresh claims the next id; any response
  // whose token is no longer current is discarded. Without this, out-of-order
  // resolutions (rapid refreshKey bumps, or getSummary/getDetails landing in a
  // different order than issued) would let a stale response overwrite newer
  // state — the outlet app has no react-query to dedupe (design finding #6).
  let requestId = 0

  async function refresh(): Promise<void> {
    const id = collectionId()
    if (!id) {
      // No collection to load — clear the optimistic mount-time loading state
      // so the UI doesn't sit on skeletons forever.
      summaryLoading.value = false
      detailsLoading.value = false
      return
    }
    const token = ++requestId
    summaryLoading.value = true
    detailsLoading.value = true
    summaryError.value = null
    detailsError.value = null
    await Promise.all([
      (async () => {
        try {
          const res = await cart.getSummary(id)
          if (token !== requestId) return
          summary.value = res
        } catch (err) {
          if (token !== requestId) return
          summaryError.value = asError(err)
        } finally {
          if (token === requestId) summaryLoading.value = false
        }
      })(),
      (async () => {
        try {
          const res = await cart.getDetails(id)
          if (token !== requestId) return
          details.value = res
        } catch (err) {
          if (token !== requestId) return
          detailsError.value = asError(err)
        } finally {
          if (token === requestId) detailsLoading.value = false
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
