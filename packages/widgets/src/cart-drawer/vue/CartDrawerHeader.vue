<script setup lang="ts">
import { computed } from 'vue'

import { formatCurrency } from '../core'
import CartUrgencyBadge from './CartUrgencyBadge.vue'

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

const totalLabel = computed(() =>
  formatCurrency(props.cartTotal, {
    locale: props.locale,
    currency: props.currency
  })
)

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
              d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"
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
            d="M216,64H176a48,48,0,0,0-96,0H40A16,16,0,0,0,24,80V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V80A16,16,0,0,0,216,64ZM128,32a32,32,0,0,1,32,32H96A32,32,0,0,1,128,32Zm88,168H40V80H216V200Z"
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
        <span class="rc-header__price-text">{{ totalLabel }}</span>
      </div>
    </div>
  </div>
</template>
