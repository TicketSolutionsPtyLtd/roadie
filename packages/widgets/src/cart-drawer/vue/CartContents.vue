<script setup lang="ts">
import { PhCalendarBlank } from '@phosphor-icons/vue'
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
    /** True while a cart-wide remove is in flight — locks the per-event trash. */
    busy?: boolean
  }>(),
  { hideFooter: false }
)

const emit = defineEmits<{
  removeEvent: [eventId: string]
}>()

const ticketCount = computed(() =>
  props.cart.events.reduce(
    (sum, event) =>
      sum + event.tickets.reduce((tSum, t) => tSum + t.quantity, 0),
    0
  )
)
const isEmpty = computed(() => ticketCount.value === 0)

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

// Collapse height + fade on removal, mirroring the React skin's AnimatePresence
// exit. Web Animations API isn't in jsdom, so fall back to an instant leave.
function onLeave(el: Element, done: () => void) {
  const node = el as HTMLElement
  if (typeof node.animate !== 'function') {
    done()
    return
  }
  const height = node.offsetHeight
  node.style.overflow = 'hidden'
  const anim = node.animate(
    [
      { height: `${height}px`, opacity: 1 },
      { height: '0px', opacity: 0 }
    ],
    { duration: 250, easing: 'ease-in-out' }
  )
  anim.onfinish = () => done()
  anim.oncancel = () => done()
}
</script>

<template>
  <CartEmptyState
    v-if="isEmpty"
    :browse-href="browseHref"
    :on-navigate="onNavigate"
  />
  <div v-else class="grid gap-5">
    <TransitionGroup tag="div" class="grid gap-5" :css="false" @leave="onLeave">
      <section
        v-for="group in dayGroups"
        :key="group.key"
        class="-mx-4 grid gap-4"
      >
        <div class="sticky top-0 z-sticky emphasis-strong px-4 py-2.5">
          <div class="flex items-center gap-2">
            <PhCalendarBlank
              weight="bold"
              class="size-4 shrink-0"
              aria-hidden="true"
            />
            <p class="text-ui-meta font-bold" data-testid="cart-group-title">
              {{ dayHeader(group.key) }}
            </p>
          </div>
        </div>
        <TransitionGroup
          tag="div"
          class="grid gap-4 px-4"
          :css="false"
          @leave="onLeave"
        >
          <div
            v-for="(event, index) in group.events"
            :key="event.eventId"
            class="grid gap-4"
          >
            <div v-if="index > 0" class="pl-6">
              <div
                role="separator"
                aria-orientation="horizontal"
                class="h-px w-full border-t border-solid border-subtle"
              />
            </div>
            <CartEventGroup
              :event="event"
              :locale="locale"
              :currency="currency"
              :busy="busy"
              @remove-event="emit('removeEvent', $event)"
            />
          </div>
        </TransitionGroup>
      </section>
    </TransitionGroup>

    <div v-if="!hideFooter" class="grid gap-4 border-t border-subtle pt-4">
      <div class="flex items-center justify-between gap-4">
        <span class="text-ui font-bold text-strong">Total</span>
        <span class="text-ui font-bold text-strong">{{
          money(cart.cartTotal)
        }}</span>
      </div>
      <p class="text-ui-meta text-subtle">
        {{
          totalBookingFees > 0
            ? `Incl. ${money(totalBookingFees)} booking fees. `
            : 'Includes booking fees. '
        }}Delivery and refund protection calculated at checkout.
      </p>
      <button
        type="button"
        class="is-interactive btn btn-md emphasis-normal intent-brand"
        :disabled="!checkoutUrl"
        @click="onCheckout"
      >
        Checkout
      </button>
    </div>
  </div>
</template>
