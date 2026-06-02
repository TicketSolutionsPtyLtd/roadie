<script setup lang="ts">
import NumberFlow from '@number-flow/vue'
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
    class="rc-header"
    :class="{ 'rc-header--bounce': bounce }"
    @pointerdown="onPointerDown"
  >
    <div class="rc-header__pill-wrap">
      <div aria-hidden="true" class="rc-header__pill" />
    </div>
    <button
      type="button"
      class="rc-header__grabber"
      :aria-expanded="isOpen"
      aria-controls="cart-drawer-body"
      :aria-label="isOpen ? 'Close cart' : 'Open cart'"
      @click="onGrabberClick"
      @keydown="onGrabberKeydown"
    />

    <div
      class="rc-header__title-area"
      :style="{ height: `${titleAreaHeight}px` }"
    >
      <div
        class="rc-header__close"
        :style="{
          opacity: closeOpacity,
          pointerEvents: isOpen ? 'auto' : 'none'
        }"
        @pointerdown.stop
      >
        <button
          type="button"
          class="rc-icon-button rc-intent-neutral"
          aria-label="Close cart"
          @click="emit('toggle')"
        >
          <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
            <path
              d="M208.49,191.51a12,12,0,0,1-17,17L128,145,64.49,208.49a12,12,0,0,1-17-17L111,128,47.51,64.49a12,12,0,0,1,17-17L128,111l63.51-63.52a12,12,0,0,1,17,17L145,128Z"
            />
          </svg>
        </button>
      </div>

      <div
        :id="titleId"
        class="rc-header__title"
        :style="{ left: titleLeft, transform: titleTransform }"
      >
        <svg
          class="rc-intent-accent"
          viewBox="0 0 256 256"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            d="M216,60H179.83A52,52,0,0,0,76.17,60H40A20,20,0,0,0,20,80V200a20,20,0,0,0,20,20H216a20,20,0,0,0,20-20V80A20,20,0,0,0,216,60ZM128,36a28,28,0,0,1,27.71,24H100.29A28,28,0,0,1,128,36Zm84,160H44V84H76V96a12,12,0,0,0,24,0V84h56V96a12,12,0,0,0,24,0V84h32Z"
          />
        </svg>
        <span class="rc-header__title-text">Cart</span>
      </div>

      <div class="rc-header__badge" :style="{ top: `${badgeTop}px` }">
        <CartUrgencyBadge
          :ticket-count="ticketCount"
          :expires-at-utc="expiresAtUtc"
          :progress="isOpen ? 1 : 0"
          :bounce="bounce"
        />
      </div>

      <div class="rc-header__price" :style="{ opacity: priceOpacity }">
        <span class="rc-header__price-text">
          <NumberFlow
            :value="cartTotal"
            :prefix="pricePrefix"
            :format="PRICE_FORMAT"
          />
        </span>
      </div>
    </div>
  </div>
</template>
