<script setup lang="ts">
import { PhBag, PhCalendarBlank } from '@phosphor-icons/vue'
import { computed } from 'vue'

import { type CartDetails, formatDayHeader, groupEventsByDay } from '../../cart'
import CartEmptyState from './CartEmptyState.vue'
import CartEventGroup from './CartEventGroup.vue'
import CartFooter from './CartFooter.vue'
import CartUrgencyBadge from './CartUrgencyBadge.vue'

const props = withDefaults(
  defineProps<{
    cart: CartDetails
    onNavigate: (href: string) => void
    browseHref: string
    checkoutUrl: string | null
    locale: string
    currency: string
    container?: 'drawer' | 'page'
    busy?: boolean
    removingEventId?: string | null
  }>(),
  { container: 'drawer', removingEventId: null }
)

const emit = defineEmits<{
  removeEvent: [eventId: string]
}>()

const isPage = computed(() => props.container === 'page')

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
function onCheckout() {
  if (props.checkoutUrl) props.onNavigate(props.checkoutUrl)
}

// WAAPI isn't in jsdom — fall back to an instant leave.
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
  <div
    class="@container isolate"
    :class="isPage ? 'flex min-h-full flex-col' : 'grid'"
  >
    <div v-if="isPage" class="@xl:mx-auto @xl:w-full @xl:max-w-lg">
      <div class="grid justify-items-center gap-2 pt-4 pb-3">
        <h2 class="flex items-center gap-2 text-display-ui-3 text-strong">
          <PhBag
            weight="bold"
            class="size-6 text-subtle intent-accent"
            aria-hidden="true"
          />
          Cart
        </h2>
        <CartUrgencyBadge
          :ticket-count="ticketCount"
          :expires-at-utc="cart.expiresAtUtc"
          :progress="1"
        />
      </div>
    </div>

    <Transition
      mode="out-in"
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isEmpty"
        key="empty"
        :class="isPage && 'grid flex-1 place-content-center'"
      >
        <CartEmptyState
          :browse-href="browseHref"
          :on-navigate="onNavigate"
          :size="isPage ? 'md' : 'sm'"
        />
      </div>
      <TransitionGroup
        v-else
        key="list"
        tag="div"
        class="grid gap-5 pb-5 @xl:mx-auto @xl:w-full @xl:max-w-lg"
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
                :busy="busy || removingEventId !== null"
                :removing="removingEventId === event.eventId"
                @remove-event="emit('removeEvent', $event)"
              />
            </div>
          </TransitionGroup>
        </section>
      </TransitionGroup>
    </Transition>

    <div
      v-if="isPage && !isEmpty"
      class="sticky bottom-0 z-sticky -mx-4 mt-auto border-t border-subtle bg-raised"
    >
      <div class="@xl:mx-auto @xl:w-full @xl:max-w-lg">
        <CartFooter
          :cart-total="cart.cartTotal"
          :booking-fees="totalBookingFees"
          :locale="locale"
          :currency="currency"
          :checkout-disabled="!checkoutUrl"
          @secondary="onNavigate(browseHref)"
          @checkout="onCheckout"
        />
      </div>
    </div>
  </div>
</template>
