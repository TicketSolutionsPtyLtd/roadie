<script setup lang="ts">
import { computed } from 'vue'

import { formatCurrency } from '../core'

const props = defineProps<{
  cartTotal: number
  locale: string
  currency: string
  isOpen: boolean
  /** Drawer open progress 0..1. */
  progress: number
  /** True while the checkout URL isn't known/safe — button disabled. */
  checkoutDisabled: boolean
}>()

const emit = defineEmits<{
  toggle: []
  checkout: []
  dragStart: [e: PointerEvent]
}>()

const subtotalLabel = computed(() =>
  formatCurrency(props.cartTotal, {
    locale: props.locale,
    currency: props.currency
  })
)

const subtotalMaxHeight = computed(() => props.progress * 50)
const subtotalOpacity = computed(() => props.progress)
const feesMaxHeight = computed(() => props.progress * 40)
const feesOpacity = computed(() =>
  Math.max(0, Math.min(1, (props.progress - 0.5) / 0.5))
)

// Shadow grows with drag progress so the footer lifts off the content as the
// drawer opens (parity with the React skin's CartDrawerHandle).
const footerShadow = computed(
  () => `0 -4px 16px oklch(0 0 0 / ${props.progress * 0.08})`
)

function onPointerDown(e: PointerEvent) {
  if (!props.isOpen) emit('dragStart', e)
}
</script>

<template>
  <div
    class="rc-footer"
    :class="{ 'rc-footer--draggable': !isOpen }"
    :style="{ boxShadow: footerShadow }"
    @pointerdown="onPointerDown"
  >
    <div class="rc-footer__inner">
      <div
        class="rc-footer__subtotal"
        :style="{
          maxHeight: `${subtotalMaxHeight}px`,
          opacity: subtotalOpacity
        }"
      >
        <span class="rc-footer__subtotal-label">Subtotal</span>
        <span class="rc-footer__subtotal-value">{{ subtotalLabel }}</span>
      </div>

      <p
        class="rc-footer__fees"
        :style="{ maxHeight: `${feesMaxHeight}px`, opacity: feesOpacity }"
      >
        Delivery and refund protection calculated at checkout
      </p>

      <div class="rc-footer__buttons" @pointerdown.stop>
        <button
          type="button"
          class="rc-button rc-button--normal rc-intent-neutral"
          @click="emit('toggle')"
        >
          {{ isOpen ? 'Browse events' : 'Open cart' }}
        </button>
        <button
          type="button"
          class="rc-button rc-button--strong rc-intent-accent"
          :disabled="checkoutDisabled"
          @click="emit('checkout')"
        >
          <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
            <path
              d="M216,64H176a48,48,0,0,0-96,0H40A16,16,0,0,0,24,80V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V80A16,16,0,0,0,216,64ZM128,32a32,32,0,0,1,32,32H96A32,32,0,0,1,128,32Zm88,168H40V80H216V200Z"
            />
          </svg>
          Checkout
        </button>
      </div>
    </div>
  </div>
</template>
