<script setup lang="ts">
import { PhClock, PhMapPin, PhTrash } from '@phosphor-icons/vue'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

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
const confirmPopupEl = ref<HTMLElement | null>(null)
// Stable ids so the trigger's aria-controls and the dialog's accessible name
// (aria-labelledby -> the prompt) resolve per-event.
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

// Focus management (focus-trap pkg) wired to the confirm popup — same pattern as
// CartDrawer.vue. On open, trap focus inside the popup (initial focus on the
// Cancel button, container fallback); on every close path the trap deactivates
// and returns focus to the trash trigger (returnFocusOnDeactivate).
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
    document.addEventListener('mousedown', onDocumentPointerDown)
    document.addEventListener('keydown', onDocumentKeydown)
    // Wait for the popup to render before trapping focus into it.
    await nextTick()
    const t = await ensureTrap()
    if (t && confirmPopupEl.value?.isConnected) {
      try {
        t.activate()
      } catch {
        /* focus-trap may throw if no focusable node yet — non-fatal */
      }
    }
  } else {
    document.removeEventListener('mousedown', onDocumentPointerDown)
    document.removeEventListener('keydown', onDocumentKeydown)
    try {
      // Deactivate returns focus to the trash trigger.
      trap?.deactivate()
    } catch {
      /* non-fatal */
    }
    // The popup unmounts on close; drop the stale trap so the next open rebuilds
    // it against the fresh element.
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
  document.removeEventListener('mousedown', onDocumentPointerDown)
  document.removeEventListener('keydown', onDocumentKeydown)
})
</script>

<template>
  <div class="grid gap-3">
    <div class="flex items-start gap-3">
      <div class="flex min-w-0 flex-1 flex-col gap-1">
        <div
          v-if="timeLabel"
          class="flex items-center gap-2 text-ui-meta text-subtle"
        >
          <PhClock
            weight="bold"
            class="size-4 shrink-0 text-subtler"
            aria-hidden="true"
          />
          <span>{{ timeLabel }}</span>
        </div>
        <div class="grid gap-1 pl-6">
          <p class="text-ui font-medium text-strong">{{ event.eventName }}</p>
          <div class="flex items-center gap-1.5 text-ui-meta text-subtle">
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
        class="size-20 shrink-0 rounded-lg bg-subtle object-cover"
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
          class="absolute top-full right-0 z-20 mt-1 grid max-w-80 gap-4 rounded-xl emphasis-floating p-4 text-pretty intent-danger"
          role="dialog"
          :aria-labelledby="confirmLabelId"
        >
          <p
            :id="confirmLabelId"
            class="text-center text-display-ui-6 text-pretty text-strong"
          >
            Remove all tickets for this event?
          </p>
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
      <div
        v-for="ticket in event.tickets"
        :key="ticket.name"
        class="grid gap-2"
      >
        <div class="md:hidden">
          <p class="text-ui font-medium text-strong">{{ ticket.name }}</p>
        </div>
        <div class="flex items-center rounded-lg bg-sunken px-3 py-2">
          <div class="hidden min-w-0 flex-1 pr-4 md:block">
            <span class="block truncate text-ui font-medium text-strong">
              {{ ticket.name }}
            </span>
          </div>
          <span class="w-20 shrink-0 text-ui-meta text-subtle">
            {{ ticket.priceEach === 0 ? 'Free' : money(ticket.priceEach) }}
          </span>
          <div class="flex flex-1 items-center justify-center">
            <span class="shrink-0 text-ui-meta font-medium text-strong">
              &times; {{ ticket.quantity }}
            </span>
          </div>
          <span
            class="w-24 shrink-0 text-right text-ui font-bold text-strong tabular-nums"
          >
            {{ money(ticket.quantity * ticket.priceEach) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
