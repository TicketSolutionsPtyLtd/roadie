<script setup lang="ts">
import NumberFlow from '@number-flow/vue'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { URGENCY_LONG_FORMAT_S, remainingSeconds, urgencyLevel } from '../core'

// Two-digit zero-pad for the seconds (0:09) — same as the React skin.
const PAD2_FORMAT = { minimumIntegerDigits: 2 }

const props = withDefaults(
  defineProps<{
    ticketCount: number
    expiresAtUtc: string | undefined
    /** Drawer open progress 0..1 — expands the "remaining to checkout" tail. */
    progress?: number
    /** Fires the badge-pop keyframe once per add. */
    bounce?: boolean
  }>(),
  { progress: 0, bounce: false }
)

// Live countdown — plain reactive 1s tick (no Web Component; jsdom-safe).
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
// Paint danger when expired (floors at 0:00 alongside danger).
const intent = computed(() =>
  level.value === 'expired' ? 'danger' : level.value
)
const showCountdown = computed(
  () => remaining.value !== null && remaining.value > 0
)
// Structured countdown values for NumberFlow (mirrors the React skin: long
// format shows "N mins"; short format rolls mm:ss).
const isLongFormat = computed(() => (remaining.value ?? 0) > URGENCY_LONG_FORMAT_S)
const minutesCeil = computed(() => Math.ceil((remaining.value ?? 0) / 60))
const minutesFloor = computed(() => Math.floor((remaining.value ?? 0) / 60))
const secondsPart = computed(() => (remaining.value ?? 0) % 60)
const ticketLabel = computed(() =>
  props.ticketCount === 1 ? 'ticket' : 'tickets'
)
</script>

<template>
  <span
    class="rc-badge"
    :class="[`rc-intent-${intent}`, { 'rc-badge--pop': bounce }]"
    :data-intent="intent"
  >
    <span
      v-if="showCountdown"
      aria-hidden="true"
      class="rc-badge__dot"
      :class="{ 'rc-badge__dot--pulse': showCountdown }"
    />
    <span class="rc-badge__count tabular-nums">
      <NumberFlow :value="ticketCount" />
    </span>
    {{ ticketLabel }}
    <template v-if="showCountdown">
      <span class="rc-badge__time tabular-nums">
        <NumberFlow v-if="isLongFormat" :value="minutesCeil" suffix=" mins" />
        <template v-else>
          <NumberFlow :value="minutesFloor" />:<NumberFlow
            :value="secondsPart"
            :format="PAD2_FORMAT"
          />
        </template>
      </span>
      <span
        class="rc-badge__tail"
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
