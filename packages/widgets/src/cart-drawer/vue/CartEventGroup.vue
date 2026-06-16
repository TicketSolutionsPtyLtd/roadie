<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

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
  /** True while a cart-wide remove is in flight — disables the trash/confirm. */
  busy?: boolean
}>()

// Presentational only: bubble the eventId up. The parent (CartDrawer) owns the
// remove flow (lock cart → cart.removeItem → refresh) — this component never
// touches the cart client itself.
const emit = defineEmits<{
  removeEvent: [eventId: string]
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

// --- Confirm popover (hand-rolled: absolutely-positioned card + click-outside,
// the same approach the prototype uses; no Base UI / Tailwind in this skin). ---
const confirming = ref(false)
const removeWrapEl = ref<HTMLElement | null>(null)
// Stable ids so the trigger's aria-controls and the dialog's accessible name
// (aria-labelledby -> the prompt) resolve per-event.
const confirmId = computed(() => `rc-confirm-${props.event.eventId}`)
const confirmLabelId = computed(() => `rc-confirm-label-${props.event.eventId}`)

function openConfirm() {
  if (props.busy) return
  confirming.value = true
}
function closeConfirm() {
  confirming.value = false
}
function confirmRemove() {
  emit('removeEvent', props.event.eventId)
  confirming.value = false
}

// Dismiss on outside pointerdown (mousedown parity with the prototype) and on
// Escape. Listeners attach only while open so a closed popover costs nothing.
function onDocumentPointerDown(e: MouseEvent) {
  if (removeWrapEl.value && !removeWrapEl.value.contains(e.target as Node)) {
    closeConfirm()
  }
}
function onDocumentKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeConfirm()
}
watch(confirming, (open) => {
  if (typeof document === 'undefined') return
  if (open) {
    document.addEventListener('mousedown', onDocumentPointerDown)
    document.addEventListener('keydown', onDocumentKeydown)
  } else {
    document.removeEventListener('mousedown', onDocumentPointerDown)
    document.removeEventListener('keydown', onDocumentKeydown)
  }
})
onBeforeUnmount(() => {
  if (typeof document === 'undefined') return
  document.removeEventListener('mousedown', onDocumentPointerDown)
  document.removeEventListener('keydown', onDocumentKeydown)
})
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
      <div ref="removeWrapEl" class="rc-event__remove">
        <button
          type="button"
          class="rc-icon-button rc-icon-button--danger rc-intent-danger"
          :aria-label="`Remove ${event.eventName}`"
          :aria-expanded="confirming"
          :aria-controls="confirmId"
          :disabled="busy"
          @click="openConfirm"
        >
          <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
            <path
              d="M216,52H40a12,12,0,0,0,0,24h4V208a20,20,0,0,0,20,20H192a20,20,0,0,0,20-20V76h4a12,12,0,0,0,0-24ZM188,204H68V76H188ZM76,40a12,12,0,0,1,12-12h80a12,12,0,0,1,0,24H88A12,12,0,0,1,76,40Zm32,80v48a12,12,0,0,1-24,0V120a12,12,0,0,1,24,0Zm64,0v48a12,12,0,0,1-24,0V120a12,12,0,0,1,24,0Z"
            />
          </svg>
        </button>

        <div
          v-if="confirming"
          :id="confirmId"
          class="rc-confirm"
          role="dialog"
          :aria-labelledby="confirmLabelId"
        >
          <p :id="confirmLabelId" class="rc-confirm__text">
            Remove all tickets for this event?
          </p>
          <div class="rc-confirm__actions">
            <button
              type="button"
              class="rc-button rc-button--sm rc-button--normal rc-intent-neutral"
              @click="closeConfirm"
            >
              Cancel
            </button>
            <button
              type="button"
              class="rc-button rc-button--sm rc-button--strong rc-intent-danger"
              :disabled="busy"
              @click="confirmRemove"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
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
