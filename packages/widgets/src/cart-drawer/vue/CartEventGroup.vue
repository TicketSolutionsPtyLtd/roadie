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
              d="M128,40a88,88,0,1,0,88,88A88.1,88.1,0,0,0,128,40Zm0,160a72,72,0,1,1,72-72A72.08,72.08,0,0,1,128,200Zm61.66-77.66a8,8,0,0,1-11.32,11.32l-56-56A8,8,0,0,1,120,72V48a8,8,0,0,1,16,0V68.69l53.66,53.65Z"
            />
          </svg>
          <span>{{ timeLabel }}</span>
        </div>
        <div class="rc-event__detail">
          <p class="rc-event__name">{{ event.eventName }}</p>
          <div class="rc-event__venue">
            <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
              <path
                d="M128,16a88.1,88.1,0,0,0-88,88c0,75.3,80,132.17,83.41,134.55a8,8,0,0,0,9.18,0C136,236.17,216,179.3,216,104A88.1,88.1,0,0,0,128,16Zm0,56a32,32,0,1,1-32,32A32,32,0,0,1,128,72Z"
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
