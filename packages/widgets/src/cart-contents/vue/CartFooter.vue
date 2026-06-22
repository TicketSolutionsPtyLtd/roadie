<script setup lang="ts">
import NumberFlow from '@number-flow/vue'
import { PhBag } from '@phosphor-icons/vue'
import { computed } from 'vue'

import { currencyPrefix, formatCurrency } from '../../cart'

const PRICE_FORMAT = { minimumFractionDigits: 2 }

const props = withDefaults(
  defineProps<{
    cartTotal: number
    bookingFees: number
    locale: string
    currency: string
    secondaryLabel?: string
    checkoutDisabled?: boolean
    /** Collapse styles for the drawer's open/close. Omit for a static footer. */
    subtotalStyle?: Record<string, string | number>
    feesStyle?: Record<string, string | number>
  }>(),
  { secondaryLabel: 'Browse events', checkoutDisabled: false }
)

const emit = defineEmits<{
  secondary: []
  checkout: []
}>()

const pricePrefix = computed(() => currencyPrefix(props.locale, props.currency))
const feesLabel = computed(() =>
  props.bookingFees > 0
    ? `Incl. ${formatCurrency(props.bookingFees, {
        locale: props.locale,
        currency: props.currency
      })} booking fees. Delivery and refund protection calculated at checkout.`
    : 'Includes booking fees. Delivery and refund protection calculated at checkout.'
)
</script>

<template>
  <div class="px-4 pt-1 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
    <div class="overflow-hidden" :style="subtotalStyle">
      <div class="flex items-center justify-between gap-4 pt-3 pb-1">
        <span class="text-ui font-bold text-strong">Subtotal</span>
        <span class="text-ui font-bold text-strong">
          <NumberFlow
            :value="cartTotal"
            :prefix="pricePrefix"
            :format="PRICE_FORMAT"
          />
        </span>
      </div>
    </div>

    <div class="overflow-hidden" :style="feesStyle">
      <p class="pb-4 text-ui-meta text-subtle" data-testid="cart-footer-fees">
        {{ feesLabel }}
      </p>
    </div>

    <!-- Don't let a press on the buttons start the drawer's drag. -->
    <div class="flex gap-3" @pointerdown.stop>
      <button
        type="button"
        class="is-interactive btn btn-md flex-1 emphasis-normal intent-neutral"
        @click="emit('secondary')"
      >
        {{ secondaryLabel }}
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
</template>
