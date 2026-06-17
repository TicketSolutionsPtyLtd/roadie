<script setup lang="ts">
import NumberFlow from '@number-flow/vue'
import { PhBag, PhX } from '@phosphor-icons/vue'
import { computed } from 'vue'

import { currencyPrefix } from '../core'
import CartUrgencyBadge from './CartUrgencyBadge.vue'

// Roll the total digits behind a locale-correct currency symbol — never a
// hardcoded "$" (matches the React skin's NumberFlow prefix approach).
const PRICE_FORMAT = { minimumFractionDigits: 2 }

const props = defineProps<{
  ticketCount: number
  cartTotal: number
  expiresAtUtc: string | undefined
  locale: string
  currency: string
  isOpen: boolean
  bounce: boolean
  /** Drawer open progress 0..1 (drives the morph). */
  progress: number
  titleId: string
}>()

const emit = defineEmits<{
  toggle: []
  dragStart: [e: PointerEvent]
}>()

const pricePrefix = computed(() => currencyPrefix(props.locale, props.currency))
const priceSuffix = computed(() => {
  const parts = new Intl.NumberFormat(props.locale, {
    style: 'currency',
    currency: props.currency
  }).formatToParts(0)

  let suffix = ''
  let seenNumber = false
  for (const part of parts) {
    const isNumberPart =
      part.type === 'integer' ||
      part.type === 'group' ||
      part.type === 'decimal' ||
      part.type === 'fraction'

    if (isNumberPart) {
      seenNumber = true
      continue
    }

    if (seenNumber && (part.type === 'currency' || part.type === 'literal')) {
      suffix += part.value
    }
  }
  return suffix
})

// Morph styles derived from progress (CSS-var-free; inline transforms).
const titleAreaHeight = computed(() => 32 + props.progress * 40)
const titleLeft = computed(() =>
  props.progress <= 0
    ? '16px'
    : `calc(${16 * (1 - props.progress)}px + ${props.progress * 50}%)`
)
const titleTransform = computed(() => `translateX(${-50 * props.progress}%)`)
const badgeTop = computed(() => 4 + props.progress * 32)
const priceOpacity = computed(() => 1 - props.progress)
const closeOpacity = computed(() =>
  Math.max(0, Math.min(1, (props.progress - 0.5) / 0.2))
)

function onPointerDown(e: PointerEvent) {
  emit('dragStart', e)
}
function onGrabberClick(e: MouseEvent) {
  // Synthetic clicks (detail === 0) = screen-reader / Enter-Space activation.
  if (e.detail === 0) emit('toggle')
}
function onGrabberKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    emit('toggle')
  }
}
</script>

<template>
  <div
    class="relative shrink-0 cursor-grab touch-none select-none active:cursor-grabbing"
    :class="{ 'animate-cart-bounce': bounce }"
    @pointerdown="onPointerDown"
  >
    <div class="flex justify-center py-2">
      <div aria-hidden="true" class="h-1.5 w-9 rounded-full bg-subtle" />
    </div>
    <button
      type="button"
      class="absolute top-0 left-1/2 size-11 -translate-x-1/2 cursor-grab appearance-none rounded-full bg-transparent text-transparent outline-offset-2 focus:outline-none focus-visible:text-strong focus-visible:outline-2 focus-visible:outline-current"
      :aria-expanded="isOpen"
      aria-controls="cart-drawer-body"
      :aria-label="isOpen ? 'Close cart' : 'Open cart'"
      @click="onGrabberClick"
      @keydown="onGrabberKeydown"
    />

    <div class="relative" :style="{ height: `${titleAreaHeight}px` }">
      <div
        class="absolute top-0 left-4"
        :style="{
          opacity: closeOpacity,
          pointerEvents: isOpen ? 'auto' : 'none'
        }"
        @pointerdown.stop
      >
        <button
          type="button"
          class="btn-icon is-interactive btn-icon-sm emphasis-subtle intent-neutral"
          aria-label="Close cart"
          @click="emit('toggle')"
        >
          <PhX weight="bold" class="size-4" aria-hidden="true" />
        </button>
      </div>

      <div
        :id="titleId"
        class="absolute top-0 flex h-8 items-center gap-2"
        :style="{ left: titleLeft, transform: titleTransform }"
      >
        <PhBag
          weight="bold"
          class="size-5 text-subtle intent-accent"
          aria-hidden="true"
        />
        <span class="text-ui font-bold text-strong">Cart</span>
      </div>

      <div
        class="absolute left-1/2 -translate-x-1/2"
        :style="{ top: `${badgeTop}px` }"
      >
        <CartUrgencyBadge
          :ticket-count="ticketCount"
          :expires-at-utc="expiresAtUtc"
          :progress="isOpen ? 1 : 0"
          :bounce="bounce"
        />
      </div>

      <div
        class="absolute top-0 right-4 flex h-8 items-center"
        :style="{ opacity: priceOpacity }"
      >
        <span
          class="text-ui font-bold text-strong"
          data-testid="cart-header-price"
        >
          <NumberFlow
            :value="cartTotal"
            :prefix="pricePrefix"
            :suffix="priceSuffix"
            :format="PRICE_FORMAT"
          />
        </span>
      </div>
    </div>
  </div>
</template>
