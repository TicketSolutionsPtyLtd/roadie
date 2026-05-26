<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { remainingSeconds, urgencyLevel } from '../core'

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
const countdownLabel = computed(() => {
  const r = remaining.value
  if (r === null || r <= 0) return ''
  if (r > 300) return `${Math.ceil(r / 60)} mins`
  const mins = Math.floor(r / 60)
  const secs = r % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
})
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
    <span class="rc-badge__count tabular-nums">{{ ticketCount }}</span>
    {{ ticketLabel }}
    <template v-if="showCountdown">
      <span class="rc-badge__time tabular-nums">{{ countdownLabel }}</span>
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
