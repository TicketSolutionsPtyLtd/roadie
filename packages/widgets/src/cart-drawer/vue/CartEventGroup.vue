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

const timeLabel = computed(() => {
  const start = new Date(props.event.eventStartAtUtc)
  const valid = !Number.isNaN(start.getTime())
  return props.event.eventDateDisplay ?? (valid ? formatTime(start) : null)
})

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

function onDocumentPointerDown(e: MouseEvent) {
  if (removeWrapEl.value && !removeWrapEl.value.contains(e.target as Node)) {
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
    document.removeEventListener('mousedown', onDocumentPointerDown)
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
