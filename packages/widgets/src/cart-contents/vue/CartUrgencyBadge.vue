<script setup lang="ts">
import NumberFlow from '@number-flow/vue'
import { PhTicket } from '@phosphor-icons/vue'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import {
  URGENCY_LONG_FORMAT_S,
  remainingSeconds,
  urgencyLevel
} from '../../cart'

const PAD2_FORMAT = { minimumIntegerDigits: 2 }

const props = withDefaults(
  defineProps<{
    ticketCount: number
    expiresAtUtc: string | undefined
    progress?: number
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
// No countdown when the cart is empty, even if a server expiry lingers.
const showCountdown = computed(
  () => props.ticketCount > 0 && remaining.value !== null && remaining.value > 0
)
const isLongFormat = computed(
  () => (remaining.value ?? 0) > URGENCY_LONG_FORMAT_S
)
const minutesCeil = computed(() => Math.ceil((remaining.value ?? 0) / 60))
const minutesFloor = computed(() => Math.floor((remaining.value ?? 0) / 60))
const secondsPart = computed(() => (remaining.value ?? 0) % 60)

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

// Animate the badge clear (width + gap). WAAPI isn't in jsdom — fall back instant.
function animateTime(
  node: HTMLElement,
  from: { width: string; opacity: number; marginLeft: string },
  to: { width: string; opacity: number; marginLeft: string },
  done: () => void
) {
  if (typeof node.animate !== 'function') {
    done()
    return
  }
  node.style.overflow = 'hidden'
  const anim = node.animate([from, to], {
    duration: 200,
    easing: 'ease-in-out'
  })
  anim.onfinish = () => done()
  anim.oncancel = () => done()
}
function onTimeEnter(el: Element, done: () => void) {
  const node = el as HTMLElement
  const width = `${node.scrollWidth}px`
  animateTime(
    node,
    { width: '0px', opacity: 0, marginLeft: '0px' },
    { width, opacity: 1, marginLeft: '6px' },
    () => {
      // Clear the inline width so the badge resizes with the countdown text.
      node.style.overflow = ''
      done()
    }
  )
}
function onTimeLeave(el: Element, done: () => void) {
  const node = el as HTMLElement
  const width = `${node.scrollWidth}px`
  animateTime(
    node,
    { width, opacity: 1, marginLeft: '6px' },
    { width: '0px', opacity: 0, marginLeft: '0px' },
    done
  )
}
</script>

<template>
  <div class="flex items-center">
    <span class="sr-only" aria-live="polite" aria-atomic="true">
      {{ announcement }}
    </span>
    <span
      class="is-interactive inline-flex emphasis-normal items-center justify-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-subtle [&_svg]:size-[1em] [&_svg]:shrink-0"
      :class="{ 'animate-pop': bounce }"
      data-testid="cart-badge-count"
    >
      <PhTicket weight="bold" aria-hidden="true" />
      <span class="flex items-baseline tabular-nums">
        <NumberFlow :value="ticketCount" />
        <span
          class="overflow-hidden whitespace-nowrap transition-[max-width,margin-left,opacity] duration-300 ease-out"
          :style="{
            maxWidth: `${Math.max(0, Math.min(1, progress)) * 200}px`,
            marginLeft: `${Math.max(0, Math.min(1, progress)) * 4}px`,
            opacity: Math.max(0, Math.min(1, progress))
          }"
        >
          {{ ticketCount === 1 ? 'ticket' : 'tickets' }}
        </span>
      </span>
    </span>
    <Transition :css="false" @enter="onTimeEnter" @leave="onTimeLeave">
      <div v-if="showCountdown" class="ml-1.5 overflow-hidden">
        <span
          class="is-interactive inline-flex emphasis-normal items-center justify-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-subtle [&_svg]:size-[1em] [&_svg]:shrink-0"
          :class="`intent-${intent}`"
          :data-intent="intent"
        >
          <span
            aria-hidden="true"
            class="size-1.5 shrink-0 animate-pulse rounded-full bg-current"
          />
          <span class="flex items-baseline tabular-nums">
            <span data-testid="cart-badge-time">
              <NumberFlow
                v-if="isLongFormat"
                :value="minutesCeil"
                suffix=" mins"
              />
              <template v-else>
                <NumberFlow :value="minutesFloor" />:<NumberFlow
                  :value="secondsPart"
                  :format="PAD2_FORMAT"
                />
              </template>
            </span>
            <span
              class="overflow-hidden whitespace-nowrap transition-[max-width,margin-left,opacity] duration-300 ease-out"
              :style="{
                maxWidth: `${Math.max(0, Math.min(1, progress)) * 200}px`,
                marginLeft: `${Math.max(0, Math.min(1, progress)) * 4}px`,
                opacity: Math.max(0, Math.min(1, progress))
              }"
            >
              remaining to checkout
            </span>
          </span>
        </span>
      </div>
    </Transition>
  </div>
</template>
