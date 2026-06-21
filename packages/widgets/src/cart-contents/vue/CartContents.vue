<script setup lang="ts">
import NumberFlow from '@number-flow/vue'
import { PhBag, PhCalendarBlank } from '@phosphor-icons/vue'
import { computed } from 'vue'

import {
  type CartDetails,
  currencyPrefix,
  formatCurrency,
  formatDayHeader,
  groupEventsByDay
} from '../../cart'
import CartEmptyState from './CartEmptyState.vue'
import CartEventGroup from './CartEventGroup.vue'

const PRICE_FORMAT = { minimumFractionDigits: 2 }

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
const pricePrefix = computed(() => currencyPrefix(props.locale, props.currency))

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
  <!-- @container so the event-image container queries (@sm/@md in
       CartEventGroup) resolve standalone, exactly as inside the drawer body.
       `isolate` keeps the sticky day headers' z-index contained to the cart —
       without it they paint over app content (the drawer gets this for free
       from its fixed z-modal panel). -->
  <div v-else class="@container isolate grid gap-5">
    <!-- Once the container is wide (@xl ≈ 576px) the list centres at a readable
         max width and the day headers pick up rounded corners. -->
    <TransitionGroup
      tag="div"
      class="grid gap-5 @xl:mx-auto @xl:w-full @xl:max-w-lg"
      :css="false"
      @leave="onLeave"
    >
      <section
        v-for="group in dayGroups"
        :key="group.key"
        class="-mx-4 grid gap-4 @xl:mx-0"
      >
        <div
          class="sticky top-0 z-sticky emphasis-strong px-4 py-2.5 @xl:rounded-xl"
        >
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

    <!-- The footer band stays full-bleed; only its content tracks the same @xl
         max-width column as the list above so they stay aligned. -->
    <div v-if="!hideFooter" class="border-t border-subtle pt-4">
      <div class="@xl:mx-auto @xl:w-full @xl:max-w-lg">
        <div class="flex items-center justify-between gap-4 pb-1">
          <span class="text-ui font-bold text-strong">Subtotal</span>
          <span class="text-ui font-bold text-strong">
            <NumberFlow
              :value="cart.cartTotal"
              :prefix="pricePrefix"
              :format="PRICE_FORMAT"
            />
          </span>
        </div>
        <p class="pb-4 text-ui-meta text-subtle">
          {{
            totalBookingFees > 0
              ? `Incl. ${money(totalBookingFees)} booking fees. `
              : 'Includes booking fees. '
          }}Delivery and refund protection calculated at checkout.
        </p>
        <!-- Mirrors the drawer footer: neutral secondary + strong-accent
           Checkout with the bag icon. -->
        <div class="flex gap-3">
          <button
            type="button"
            class="is-interactive btn btn-md flex-1 emphasis-normal intent-neutral"
            @click="onNavigate(browseHref)"
          >
            Browse events
          </button>
          <button
            type="button"
            class="is-interactive btn btn-md flex-1 emphasis-strong intent-accent"
            :disabled="!checkoutUrl"
            @click="onCheckout"
          >
            <PhBag weight="bold" :class="'mr-1.5 size-4'" aria-hidden="true" />
            Checkout
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
