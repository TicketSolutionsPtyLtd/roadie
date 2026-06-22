import {
  type MaybeRefOrGetter,
  type Ref,
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  toValue
} from 'vue'

import { remainingSeconds, urgencyLevel } from '../../cart'

export interface CartExpiryState {
  remaining: Readonly<Ref<number | null>>
  expired: Readonly<Ref<boolean>>
  showWarning: Readonly<Ref<boolean>>
  dismissWarning: () => void
}

// Vue mirror of the React useCartExpiry hook. One-shot warning keyed on
// expiresAtUtc (a server-side extension re-arms it). Call from setup() — it
// registers lifecycle hooks for the timer.
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
