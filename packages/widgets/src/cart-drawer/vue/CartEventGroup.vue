<script setup lang="ts">
import { computed } from 'vue'

import {
  type CartEvent,
  formatCurrency,
  formatTime,
  isSafeImageUrl
} from '../core'

const props = defineProps<{
  event: CartEvent
  /** Locale for currency/time formatting (design finding #1). */
  locale: string
  /** ISO 4217 currency code (design finding #1). */
  currency: string
}>()

// Time of day from the UTC start; eventDateDisplay (if provided) wins.
const timeLabel = computed(() => {
  const start = new Date(props.event.eventStartAtUtc)
  const valid = !Number.isNaN(start.getTime())
  return props.event.eventDateDisplay ?? (valid ? formatTime(start) : null)
})

// Only render API-supplied images from absolute http(s) URLs — a hostile API
// could otherwise beacon viewers via a protocol-relative tracking pixel.
const safeImageUrl = computed(() =>
  isSafeImageUrl(props.event.imageUrl) ? props.event.imageUrl : null
)

function money(amount: number): string {
  return formatCurrency(amount, {
    locale: props.locale,
    currency: props.currency
  })
}
</script>

<template>
  <div class="rc-event">
    <div class="rc-event__row">
      <div class="rc-event__info">
        <div v-if="timeLabel" class="rc-event__time">
          <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
            <path
              d="M128,20A108,108,0,1,0,236,128,108.12,108.12,0,0,0,128,20Zm0,192a84,84,0,1,1,84-84A84.09,84.09,0,0,1,128,212Zm68-84a12,12,0,0,1-12,12H128a12,12,0,0,1-12-12V72a12,12,0,0,1,24,0v44h44A12,12,0,0,1,196,128Z"
            />
          </svg>
          <span>{{ timeLabel }}</span>
        </div>
        <div class="rc-event__detail">
          <p class="rc-event__name">{{ event.eventName }}</p>
          <div class="rc-event__venue">
            <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
              <path
                d="M128,60a44,44,0,1,0,44,44A44.05,44.05,0,0,0,128,60Zm0,64a20,20,0,1,1,20-20A20,20,0,0,1,128,124Zm0-112a92.1,92.1,0,0,0-92,92c0,77.36,81.64,135.4,85.12,137.83a12,12,0,0,0,13.76,0,259,259,0,0,0,42.18-39C205.15,170.57,220,136.37,220,104A92.1,92.1,0,0,0,128,12Zm31.3,174.71A249.35,249.35,0,0,1,128,216.89a249.35,249.35,0,0,1-31.3-30.18C80,167.37,60,137.31,60,104a68,68,0,0,1,136,0C196,137.31,176,167.37,159.3,186.71Z"
              />
            </svg>
            <span>{{ event.venueName }}</span>
          </div>
        </div>
      </div>
      <img
        v-if="safeImageUrl"
        :src="safeImageUrl"
        :alt="event.eventName"
        class="rc-event__image"
      />
    </div>

    <div class="rc-event__tickets">
      <div v-for="ticket in event.tickets" :key="ticket.name" class="rc-ticket">
        <span class="rc-ticket__name">{{ ticket.name }}</span>
        <span class="rc-ticket__price">
          {{ ticket.priceEach === 0 ? 'Free' : money(ticket.priceEach) }}
        </span>
        <span class="rc-ticket__qty">&times; {{ ticket.quantity }}</span>
        <span class="rc-ticket__total tabular-nums">
          {{ money(ticket.quantity * ticket.priceEach) }}
        </span>
      </div>
    </div>
  </div>
</template>
