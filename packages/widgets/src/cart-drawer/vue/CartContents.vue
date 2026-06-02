<script setup lang="ts">
import { computed } from 'vue'

import {
  type CartDetails,
  formatCurrency,
  formatDayHeader,
  groupEventsByDay
} from '../core'
import CartEmptyState from './CartEmptyState.vue'
import CartEventGroup from './CartEventGroup.vue'

const props = withDefaults(
  defineProps<{
    cart: CartDetails
    onNavigate: (href: string) => void
    /** App-specific browse target for the empty state (design finding #4). */
    browseHref: string
    /** Pre-validated checkout URL; null disables the CTA (unsafe extrasUrl). */
    checkoutUrl: string | null
    locale: string
    currency: string
    /** Skip the Total / fees / Checkout footer (the drawer renders its own). */
    hideFooter?: boolean
  }>(),
  { hideFooter: false }
)

const ticketCount = computed(() =>
  props.cart.events.reduce(
    (sum, event) =>
      sum + event.tickets.reduce((tSum, t) => tSum + t.quantity, 0),
    0
  )
)
const isEmpty = computed(() => ticketCount.value === 0)

// Core groups by venue-local eventDateKey and orders by eventStartAtUtc.
const dayGroups = computed(() => groupEventsByDay(props.cart.events))
const totalBookingFees = computed(() =>
  props.cart.events.reduce((sum, event) => sum + event.bookingFees, 0)
)

function dayHeader(key: string): string {
  return formatDayHeader(key, { locale: props.locale })
}
function money(amount: number): string {
  return formatCurrency(amount, {
    locale: props.locale,
    currency: props.currency
  })
}
function onCheckout() {
  if (props.checkoutUrl) props.onNavigate(props.checkoutUrl)
}
</script>

<template>
  <CartEmptyState
    v-if="isEmpty"
    :browse-href="browseHref"
    :on-navigate="onNavigate"
  />
  <div v-else class="rc-contents">
    <div class="rc-contents__groups">
      <section v-for="group in dayGroups" :key="group.key" class="rc-group">
        <div class="rc-group__header">
          <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
            <path
              d="M208,28H188V24a12,12,0,0,0-24,0v4H92V24a12,12,0,0,0-24,0v4H48A20,20,0,0,0,28,48V208a20,20,0,0,0,20,20H208a20,20,0,0,0,20-20V48A20,20,0,0,0,208,28ZM68,52a12,12,0,0,0,24,0h72a12,12,0,0,0,24,0h16V76H52V52ZM52,204V100H204V204Z"
            />
          </svg>
          <p class="rc-group__title">{{ dayHeader(group.key) }}</p>
        </div>
        <div class="rc-group__events">
          <CartEventGroup
            v-for="event in group.events"
            :key="event.eventId"
            :event="event"
            :locale="locale"
            :currency="currency"
          />
        </div>
      </section>
    </div>

    <div v-if="!hideFooter" class="rc-contents__footer">
      <div class="rc-contents__total">
        <span class="rc-contents__total-label">Total</span>
        <span class="rc-contents__total-value">{{
          money(cart.cartTotal)
        }}</span>
      </div>
      <p class="rc-contents__fees">
        {{
          totalBookingFees > 0
            ? `Incl. ${money(totalBookingFees)} booking fees. `
            : 'Includes booking fees. '
        }}Delivery and refund protection calculated at checkout
      </p>
      <button
        type="button"
        class="rc-button rc-button--normal rc-intent-brand"
        :disabled="!checkoutUrl"
        @click="onCheckout"
      >
        Checkout
      </button>
    </div>
  </div>
</template>
