<script setup lang="ts">
import {
  PhClock,
  PhMapPin,
  PhSeat,
  PhTicket,
  PhTrash
} from '@phosphor-icons/vue'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

import {
  type CartEvent,
  formatCurrency,
  formatEventSchedule,
  formatSeatRange,
  isSafeImageUrl
} from '../core'

const props = defineProps<{
  event: CartEvent
  /** Locale for currency/time formatting. */
  locale: string
  /** ISO 4217 currency code. */
  currency: string
  /** True while a cart-wide remove is in flight. */
  busy?: boolean
}>()

const emit = defineEmits<{
  removeEvent: [eventId: string]
}>()

const timeLabel = computed(
  () =>
    props.event.eventDateDisplay ??
    formatEventSchedule(props.event, { locale: props.locale })
)

// Precompute the seat label once and key rows by name + price + seats so
// distinct reserved-seat allocations sharing a ticket name don't collide.
const ticketRows = computed(() =>
  props.event.tickets.map((ticket) => {
    const seatLabel = formatSeatRange(ticket.seats)
    return {
      ticket,
      seatLabel,
      key: `${ticket.name}|${ticket.priceEach}|${seatLabel ?? ''}`
    }
  })
)

// Security: only render absolute http(s) image URLs (avoid hostile-API beacon).
const safeImageUrl = computed(() =>
  isSafeImageUrl(props.event.imageUrl) ? props.event.imageUrl : null
)

function money(amount: number): string {
  return formatCurrency(amount, {
    locale: props.locale,
    currency: props.currency
  })
}

const confirming = ref(false)
const removeWrapEl = ref<HTMLElement | null>(null)
const confirmPopupEl = ref<HTMLElement | null>(null)
const confirmId = computed(() => `cart-confirm-${props.event.eventId}`)
const confirmLabelId = computed(
  () => `cart-confirm-label-${props.event.eventId}`
)

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

function onDocumentPointerDown(e: PointerEvent) {
  if (
    e.target instanceof Node &&
    removeWrapEl.value &&
    !removeWrapEl.value.contains(e.target)
  ) {
    closeConfirm()
  }
}
function onDocumentKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeConfirm()
}

const confirmCancelEl = ref<HTMLButtonElement | null>(null)
type FocusTrapInstance = { activate: () => void; deactivate: () => void }
let trap: FocusTrapInstance | null = null
async function ensureTrap(): Promise<FocusTrapInstance | null> {
  const el = confirmPopupEl.value
  if (trap || !el) return trap
  try {
    const mod = await import('focus-trap')
    trap = mod.createFocusTrap(el, {
      escapeDeactivates: false,
      clickOutsideDeactivates: false,
      // Don't preventDefault outside clicks — the trap would otherwise swallow a
      // click on the drawer's close button while the confirm is open. The
      // document pointerdown handler still closes the confirm; the click also
      // reaches the close button, so one click dismisses both.
      allowOutsideClick: true,
      returnFocusOnDeactivate: true,
      initialFocus: () =>
        confirmCancelEl.value ?? confirmPopupEl.value ?? false,
      fallbackFocus: () => confirmPopupEl.value ?? el
    })
  } catch {
    trap = null
  }
  return trap
}

watch(confirming, async (open) => {
  if (typeof document === 'undefined') return
  if (open) {
    document.addEventListener('pointerdown', onDocumentPointerDown)
    document.addEventListener('keydown', onDocumentKeydown)
    await nextTick()
    const t = await ensureTrap()
    if (t && confirmPopupEl.value?.isConnected) {
      try {
        t.activate()
      } catch {
        /* non-fatal */
      }
    }
  } else {
    document.removeEventListener('pointerdown', onDocumentPointerDown)
    document.removeEventListener('keydown', onDocumentKeydown)
    try {
      trap?.deactivate()
    } catch {
      /* non-fatal */
    }
    // Drop the stale trap so the next open rebuilds against the fresh element.
    trap = null
  }
})
onBeforeUnmount(() => {
  try {
    trap?.deactivate()
  } catch {
    /* non-fatal */
  }
  trap = null
  if (typeof document === 'undefined') return
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  document.removeEventListener('keydown', onDocumentKeydown)
})
</script>

<template>
  <div class="grid gap-3">
    <div class="flex items-start gap-1">
      <div class="flex min-w-0 flex-1 flex-col gap-2">
        <div
          v-if="timeLabel"
          class="flex items-center gap-2 text-ui-meta font-medium text-subtle"
        >
          <PhClock
            weight="bold"
            class="size-4 shrink-0 text-subtler"
            aria-hidden="true"
          />
          <span>{{ timeLabel }}</span>
        </div>
        <div class="grid gap-1 pl-6">
          <p class="text-display-ui-6 text-strong">{{ event.eventName }}</p>
          <div class="flex items-center gap-1 text-ui-meta text-subtle">
            <PhMapPin
              weight="bold"
              class="size-3.5 shrink-0 text-subtler"
              aria-hidden="true"
            />
            <span>{{ event.venueName }}</span>
          </div>
        </div>
      </div>
      <img
        v-if="safeImageUrl"
        :src="safeImageUrl"
        :alt="event.eventName"
        class="hidden size-16 shrink-0 rounded-lg bg-subtle object-cover @sm:block @md:size-20"
      />
      <div ref="removeWrapEl" class="relative shrink-0 self-start">
        <button
          type="button"
          class="is-interactive btn btn-icon-sm emphasis-subtler intent-danger"
          :aria-label="`Remove ${event.eventName}`"
          :aria-expanded="confirming"
          :aria-controls="confirmId"
          :disabled="busy"
          @click="openConfirm"
        >
          <PhTrash weight="bold" class="size-4" aria-hidden="true" />
        </button>

        <div
          v-if="confirming"
          :id="confirmId"
          ref="confirmPopupEl"
          data-cart-confirm
          class="absolute top-full right-0 z-popover mt-1 grid w-max max-w-80 gap-4 rounded-xl emphasis-floating p-4 text-pretty intent-danger"
          role="dialog"
          :aria-labelledby="confirmLabelId"
        >
          <svg
            viewBox="0 0 20 10"
            aria-hidden="true"
            class="absolute top-[-7px] right-4 z-10 h-2 w-4 fill-(--intent-bg-raised) stroke-(--rim-light-edge)"
            stroke-width="1"
            stroke-linejoin="round"
            stroke-linecap="round"
          >
            <path d="M0 10 L10 0 L20 10" />
          </svg>
          <div class="grid gap-1 text-center">
            <p :id="confirmLabelId" class="text-display-ui-6 text-strong">
              Remove all tickets for this event?
            </p>
            <p class="text-sm text-subtle">This action cannot be undone.</p>
          </div>
          <div class="flex justify-center gap-2">
            <button
              ref="confirmCancelEl"
              type="button"
              class="is-interactive btn btn-sm emphasis-normal intent-neutral"
              @click="closeConfirm"
            >
              Cancel
            </button>
            <button
              type="button"
              class="is-interactive btn btn-sm emphasis-strong intent-danger"
              :disabled="busy"
              @click="confirmRemove"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="grid gap-3 pl-6">
      <div v-for="row in ticketRows" :key="row.key" class="grid gap-1">
        <div class="flex items-center justify-between gap-2">
          <p class="min-w-0 truncate text-ui-meta font-medium text-strong">
            {{ row.ticket.name }}
          </p>
          <span
            v-if="row.seatLabel"
            class="inline-flex shrink-0 items-center justify-center gap-1 rounded-full emphasis-subtle px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-subtle [&_svg]:size-[1em] [&_svg]:shrink-0"
          >
            <PhSeat weight="bold" aria-hidden="true" />
            {{ row.seatLabel }}
          </span>
        </div>
        <div class="flex items-center rounded-lg emphasis-subtle px-2 py-1.5">
          <span class="w-20 shrink-0 text-ui-meta font-medium text-subtle">
            {{
              row.ticket.priceEach === 0 ? 'Free' : money(row.ticket.priceEach)
            }}
          </span>
          <div class="flex flex-1 items-center justify-center">
            <span
              class="inline-flex emphasis-normal items-center justify-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-subtle [&_svg]:size-[1em] [&_svg]:shrink-0"
            >
              <PhTicket weight="bold" aria-hidden="true" />
              {{ row.ticket.quantity }}
            </span>
          </div>
          <span
            class="w-24 shrink-0 text-right text-ui-meta font-medium text-strong tabular-nums"
          >
            {{ money(row.ticket.quantity * row.ticket.priceEach) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
