<script setup lang="ts">
import { computed } from 'vue'

import CartFooter from '../../cart-contents/vue/CartFooter.vue'

const props = defineProps<{
  cartTotal: number
  /** Summed booking fees across cart events — drives the footer fees line. */
  bookingFees: number
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

// `event` context always navigates; `collection` context toggles the drawer.
function onSecondary() {
  if (props.context === 'event') {
    emit('browse')
    return
  }
  emit('toggle')
}

const secondaryLabel = computed(() =>
  props.context === 'event' || props.isOpen ? 'Browse events' : 'View cart'
)

const subtotalStyle = computed(() => ({
  maxHeight: `${props.progress * 50}px`,
  opacity: props.progress
}))
const feesStyle = computed(() => ({
  maxHeight: `${props.progress * 64}px`,
  opacity: Math.max(0, Math.min(1, (props.progress - 0.5) / 0.5))
}))

const footerShadow = computed(
  () =>
    `0 -4px 16px oklch(0.1 0.04 var(--intent-hue) / ${props.progress * 0.08})`
)

function onPointerDown(e: PointerEvent) {
  if (!props.isOpen) emit('dragStart', e)
}
</script>

<template>
  <div
    class="shrink-0 bg-raised"
    :class="{
      'cursor-grab touch-none select-none active:cursor-grabbing': !isOpen
    }"
    :style="{ boxShadow: footerShadow }"
    @pointerdown="onPointerDown"
  >
    <CartFooter
      :cart-total="cartTotal"
      :booking-fees="bookingFees"
      :locale="locale"
      :currency="currency"
      :secondary-label="secondaryLabel"
      :checkout-disabled="checkoutDisabled"
      :subtotal-style="subtotalStyle"
      :fees-style="feesStyle"
      @secondary="onSecondary"
      @checkout="emit('checkout')"
    />
  </div>
</template>
