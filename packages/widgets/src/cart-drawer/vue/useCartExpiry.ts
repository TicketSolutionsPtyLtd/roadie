import {
  type MaybeRefOrGetter,
  type Ref,
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  toValue
} from 'vue'

import { remainingSeconds, urgencyLevel } from '../core'

export interface CartExpiryState {
  /** Seconds remaining, clamped at 0; null when there is no expiry. */
  remaining: Ref<number | null>
  /** True once the hold has elapsed. */
  expired: Ref<boolean>
  /** True while inside the warning window and not yet dismissed for this hold. */
  showWarning: Ref<boolean>
  /** Dismiss the warning until the server issues a new expiresAtUtc. */
  dismissWarning: () => void
}

// Vue mirror of the React useCartExpiry hook. Derives the expiry-modal state
// from a 1s countdown to expiresAtUtc. Core urgencyLevel encodes the bands:
// 'danger' = the <120s warning window (>0), 'expired' = 0. The warning is
// one-shot per hold (keyed on expiresAtUtc) so a server-side extension re-arms
// it. Accepts a ref/getter so the host can pass a reactive expiry without
// wrapping. Call from setup() — it registers lifecycle hooks for the timer.
export function useCartExpiry(
  expiresAtUtc: MaybeRefOrGetter<string | undefined>
): CartExpiryState {
  const now = ref(Date.now())
  let timer: ReturnType<typeof setInterval> | null = null
  onMounted(() => {
    timer = setInterval(() => {
      now.value = Date.now()
    }, 1000)
  })
  onBeforeUnmount(() => {
    if (timer !== null) clearInterval(timer)
  })

  const remaining = computed(() =>
    remainingSeconds(toValue(expiresAtUtc), now.value)
  )
  const expired = computed(() => urgencyLevel(remaining.value) === 'expired')

  const dismissedFor = ref<string | undefined>(undefined)
  function dismissWarning(): void {
    dismissedFor.value = toValue(expiresAtUtc)
  }
  const showWarning = computed(
    () =>
      urgencyLevel(remaining.value) === 'danger' &&
      dismissedFor.value !== toValue(expiresAtUtc)
  )

  return { remaining, expired, showWarning, dismissWarning }
}
