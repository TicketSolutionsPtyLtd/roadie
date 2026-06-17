<script setup lang="ts">
import { PhBag } from '@phosphor-icons/vue'
import { computed } from 'vue'

import { formatCurrency } from '../core'

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
function onSecondaryClick() {
  if (props.context === 'event') {
    emit('browse')
    return
  }
  emit('toggle')
}

const subtotalLabel = computed(() =>
  formatCurrency(props.cartTotal, {
    locale: props.locale,
    currency: props.currency
  })
)

const feesLabel = computed(() =>
  props.bookingFees > 0
    ? `Incl. ${formatCurrency(props.bookingFees, {
        locale: props.locale,
        currency: props.currency
      })} booking fees. Delivery and refund protection calculated at checkout`
    : 'Includes booking fees. Delivery and refund protection calculated at checkout'
)

const subtotalMaxHeight = computed(() => props.progress * 50)
const subtotalOpacity = computed(() => props.progress)
const feesMaxHeight = computed(() => props.progress * 40)
const feesOpacity = computed(() =>
  Math.max(0, Math.min(1, (props.progress - 0.5) / 0.5))
)

const footerShadow = computed(
  () => `0 -4px 16px oklch(0 0 0 / ${props.progress * 0.08})`
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
    <div class="px-4 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div
        class="overflow-hidden"
        :style="{
          maxHeight: `${subtotalMaxHeight}px`,
          opacity: subtotalOpacity
        }"
      >
        <div class="flex items-center justify-between gap-4 pb-2">
          <span class="text-ui font-bold text-strong">Subtotal</span>
          <span class="text-ui font-bold text-strong">{{ subtotalLabel }}</span>
        </div>
      </div>

      <p
        class="overflow-hidden pb-2 text-ui-meta text-subtle"
        data-testid="cart-footer-fees"
        :style="{ maxHeight: `${feesMaxHeight}px`, opacity: feesOpacity }"
      >
        {{ feesLabel }}
      </p>

      <div class="flex gap-3" @pointerdown.stop>
        <button
          type="button"
          class="is-interactive btn btn-md flex-1 emphasis-normal intent-neutral"
          @click="onSecondaryClick"
        >
          {{ context === 'event' || isOpen ? 'Browse events' : 'View cart' }}
        </button>
        <button
          type="button"
          class="is-interactive btn btn-md flex-1 emphasis-strong intent-accent"
          :disabled="checkoutDisabled"
          @click="emit('checkout')"
        >
          <PhBag weight="bold" :class="'mr-1.5 size-4'" aria-hidden="true" />
          Checkout
        </button>
      </div>
    </div>
  </div>
</template>
