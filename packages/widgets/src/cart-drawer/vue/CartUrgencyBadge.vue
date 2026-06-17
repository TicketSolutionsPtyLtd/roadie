<script setup lang="ts">
import NumberFlow from '@number-flow/vue'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { URGENCY_LONG_FORMAT_S, remainingSeconds, urgencyLevel } from '../core'

const PAD2_FORMAT = { minimumIntegerDigits: 2 }

const props = withDefaults(
  defineProps<{
    ticketCount: number
    expiresAtUtc: string | undefined
    /** Drawer open progress 0..1. */
    progress?: number
    /** Fires the badge-pop keyframe once per add. */
    bounce?: boolean
  }>(),
  { progress: 0, bounce: false }
)

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
  remainingSeconds(props.expiresAtUtc, now.value)
)
const level = computed(() => urgencyLevel(remaining.value))
const intent = computed(() =>
  level.value === 'expired' ? 'danger' : level.value
)
const showCountdown = computed(
  () => remaining.value !== null && remaining.value > 0
)
const isLongFormat = computed(
  () => (remaining.value ?? 0) > URGENCY_LONG_FORMAT_S
)
const minutesCeil = computed(() => Math.ceil((remaining.value ?? 0) / 60))
const minutesFloor = computed(() => Math.floor((remaining.value ?? 0) / 60))
const secondsPart = computed(() => (remaining.value ?? 0) % 60)
const ticketLabel = computed(() =>
  props.ticketCount === 1 ? 'ticket' : 'tickets'
)

const coarseMessage = computed(() => {
  if (level.value === 'expired') return 'Cart expired'
  if (remaining.value === null) return ''
  if (level.value === 'danger') return 'Cart expiring soon'
  const minutes = Math.ceil(remaining.value / 60)
  return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} remaining to checkout`
})
const minuteBucket = computed(() =>
  remaining.value === null ? null : Math.ceil(remaining.value / 60)
)
const announcement = ref('')
watch(
  () => `${level.value}:${minuteBucket.value}`,
  () => {
    announcement.value = coarseMessage.value
  },
  { immediate: true }
)
</script>

<template>
  <span
    class="inline-flex items-center justify-center gap-2 rounded-full emphasis-subtle px-3 py-1 text-xs font-semibold whitespace-nowrap text-subtle [&_svg]:size-[1em] [&_svg]:shrink-0"
    :class="[`intent-${intent}`, { 'animate-badge-pop': bounce }]"
    :data-intent="intent"
  >
    <span class="sr-only" aria-live="polite" aria-atomic="true">
      {{ announcement }}
    </span>
    <span
      v-if="showCountdown"
      aria-hidden="true"
      class="size-1.5 shrink-0 rounded-full bg-current"
      :class="{ 'animate-pulse': showCountdown }"
    />
    <span class="tabular-nums" data-testid="cart-badge-count">
      <NumberFlow :value="ticketCount" />
    </span>
    {{ ticketLabel }}
    <template v-if="showCountdown">
      <span class="tabular-nums" data-testid="cart-badge-time">
        <NumberFlow v-if="isLongFormat" :value="minutesCeil" suffix=" mins" />
        <template v-else>
          <NumberFlow :value="minutesFloor" />:<NumberFlow
            :value="secondsPart"
            :format="PAD2_FORMAT"
          />
        </template>
      </span>
      <span
        class="overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-300 ease-out"
        :style="{
          maxWidth: `${Math.max(0, Math.min(1, progress)) * 200}px`,
          opacity: Math.max(0, Math.min(1, progress))
        }"
      >
        remaining to checkout
      </span>
    </template>
  </span>
</template>
