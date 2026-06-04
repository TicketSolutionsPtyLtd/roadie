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
  /** Mount context — drives the open-state "Browse events" action. */
  context: 'collection' | 'event'
}>()

const emit = defineEmits<{
  toggle: []
  checkout: []
  /** Open-state "Browse events" in `event` context — parent navigates. */
  browse: []
  dragStart: [e: PointerEvent]
}>()

// Closed → open the drawer. Open → "Browse events": in `event` context the
// parent navigates to the package-built collection URL; in `collection`
// context we just close (the collection page is already behind the drawer).
function onSecondaryClick() {
  if (!props.isOpen) {
    emit('toggle')
    return
  }
  if (props.context === 'event') emit('browse')
  else emit('toggle')
}

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
          @click="onSecondaryClick"
        >
          {{ isOpen ? 'Browse events' : 'View cart' }}
        </button>
        <button
          type="button"
          class="rc-button rc-button--strong rc-intent-accent"
          :disabled="checkoutDisabled"
          @click="emit('checkout')"
        >
          <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
            <path
              d="M216,60H179.83A52,52,0,0,0,76.17,60H40A20,20,0,0,0,20,80V200a20,20,0,0,0,20,20H216a20,20,0,0,0,20-20V80A20,20,0,0,0,216,60ZM128,36a28,28,0,0,1,27.71,24H100.29A28,28,0,0,1,128,36Zm84,160H44V84H76V96a12,12,0,0,0,24,0V84h56V96a12,12,0,0,0,24,0V84h32Z"
            />
          </svg>
          Checkout
        </button>
      </div>
    </div>
  </div>
</template>
