<script setup lang="ts">
import {
  type ComponentPublicInstance,
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  useId,
  watch
} from 'vue'

import {
  BOUNCE_HOLD_MS,
  type ExpiryWatcher,
  buildBrowseHref,
  createExpiryWatcher,
  deriveBookingFees,
  deriveCartTotal,
  deriveTicketCount,
  isSafeRelativePath,
  remainingSeconds,
  urgencyLevel
} from '../core'
import CartContents from './CartContents.vue'
import CartDrawerFooter from './CartDrawerFooter.vue'
import CartDrawerHeader from './CartDrawerHeader.vue'
import CartExpiryModals from './CartExpiryModals.vue'
import type { CartDrawerProps } from './types'
import { useCart } from './useCart'
import { useCartDrawerDrag } from './useCartDrawerDrag'

const props = withDefaults(defineProps<CartDrawerProps>(), {
  refreshKey: undefined,
  lockBodyScroll: true,
  initialState: 'closed',
  context: 'collection',
  onOpenChange: undefined,
  onExpire: undefined,
  onHeightChange: undefined
})

const cartHeadingId = useId()

// Resolve a template ref (DOM element or child component instance) to its root
// HTMLElement for measurement. Typed so the SFC boundary keeps real prop types
// — no `*.vue` shim flattening everything to `unknown`.
function resolveRootEl(
  el: Element | ComponentPublicInstance | null
): HTMLElement | null {
  if (el instanceof HTMLElement) return el
  const root = (el as ComponentPublicInstance | null)?.$el
  return root instanceof HTMLElement ? root : null
}

// Empty-state browse target. Prefer a consumer-supplied browseHref only if
// it's a safe same-origin relative path; otherwise build the default from
// collectionId so a tainted host value can never reach onNavigate.
const effectiveBrowseHref = computed(() =>
  typeof props.browseHref === 'string' && isSafeRelativePath(props.browseHref)
    ? props.browseHref
    : buildBrowseHref(props.collectionId)
)

const { summary, details, detailsLoading, detailsError } = useCart(
  props.cart,
  () => props.collectionId,
  () => props.refreshKey
)

// Count + total are sourced from `details` (the /cart payload) — the same
// fresh data that drives the event list — NOT the separate /cart/summary
// endpoint. summary is only a fallback for the brief window before details
// load. Binding to summary made the header/footer go stale when its refetch
// lagged/errored while details updated (the count/total "not reacting" bug).
const displayTicketCount = computed(() =>
  deriveTicketCount(details.value, summary.value)
)
const displayTotal = computed(() =>
  deriveCartTotal(details.value, summary.value)
)
const displayBookingFees = computed(() => deriveBookingFees(details.value))

const {
  state,
  toggle,
  dragHeight,
  progress,
  closedHeight,
  isDragging,
  setHeaderElement,
  setFooterElement,
  handleDragStart
} = useCartDrawerDrag({ initialState: props.initialState })

// Stable ref callbacks — MUST keep a constant identity. An inline arrow
// `:ref="(el) => setHeaderElement(...)"` is a fresh function every render, so
// Vue re-invokes it on every render → setHeaderElement disconnect()+observe()s
// the ResizeObserver, whose deferred write schedules another render →
// re-observe → a cross-frame loop that freezes the tab (worst during drag,
// when dragHeight re-renders continuously). A stable identity fires only on
// real mount/unmount.
const bindHeader = (el: Element | ComponentPublicInstance | null): void => {
  setHeaderElement(resolveRootEl(el))
}
const bindFooter = (el: Element | ComponentPublicInstance | null): void => {
  setFooterElement(resolveRootEl(el))
}

const isOpen = computed(() => state.value === 'open')

// --- Open/close reporting (design finding #9) ---
watch(state, (next, prev) => {
  if (next !== prev) props.onOpenChange?.(next === 'open')
})

// --- Bounce: true for 600ms after ticket count increases ---
const bounce = ref(false)
let bounceTimer: ReturnType<typeof setTimeout> | null = null
let prevTicketCount: number | undefined
watch(displayTicketCount, (count) => {
  if (prevTicketCount !== undefined && count > prevTicketCount) {
    bounce.value = true
    if (bounceTimer !== null) clearTimeout(bounceTimer)
    bounceTimer = setTimeout(() => {
      bounce.value = false
    }, BOUNCE_HOLD_MS)
  }
  prevTicketCount = count
})

// --- Expiry watch (design finding #10) ---
// Once-latch + polling live in the shared core watcher; recreating it on
// expiry change resets the latch.
const expiresAtUtc = computed(
  () => summary.value?.expiresAtUtc ?? details.value?.expiresAtUtc
)
let expireWatcher: ExpiryWatcher | null = null
watch(
  expiresAtUtc,
  (expiry) => {
    expireWatcher?.stop()
    expireWatcher = null
    if (!expiry || !props.onExpire) return
    expireWatcher = createExpiryWatcher(expiry, props.onExpire)
  },
  { immediate: true }
)

// --- Reactive countdown for the expiry modals (warning + expired) ---
// Plain 1s tick (the badge runs its own); drives the two modals + the
// hide-on-expiry gate. Core urgencyLevel encodes the bands: 'danger' = the
// <120s warning window, 'expired' = 0. Warning is one-shot per hold.
const now = ref(Date.now())
let countdownTimer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  countdownTimer = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})
onBeforeUnmount(() => {
  if (countdownTimer !== null) clearInterval(countdownTimer)
})
const remaining = computed(() =>
  remainingSeconds(expiresAtUtc.value, now.value)
)
const expired = computed(() => urgencyLevel(remaining.value) === 'expired')
const dismissedFor = ref<string | undefined>(undefined)
function dismissWarning() {
  dismissedFor.value = expiresAtUtc.value
}
const showWarning = computed(
  () =>
    urgencyLevel(remaining.value) === 'danger' &&
    dismissedFor.value !== expiresAtUtc.value
)

// --- Closed drawer height → CSS var + onHeightChange (design finding #5) ---
watch(
  closedHeight,
  (h) => {
    props.onHeightChange?.(h)
    if (typeof document === 'undefined') return
    document.documentElement.style.setProperty('--cart-drawer-height', `${h}px`)
  },
  { immediate: true }
)

// --- Body scroll lock when open ---
watch([() => props.lockBodyScroll, isOpen], ([lock, open]) => {
  if (typeof document === 'undefined') return
  if (lock && open) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})

// --- Escape closes ---
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isOpen.value) toggle()
}

// --- Focus trap (focus-trap pkg) wired to the dialog while open ---
const drawerEl = ref<HTMLElement | null>(null)
type FocusTrapInstance = { activate: () => void; deactivate: () => void }
let trap: FocusTrapInstance | null = null
async function ensureTrap(): Promise<FocusTrapInstance | null> {
  const el = drawerEl.value
  if (trap || !el) return trap
  try {
    const mod = await import('focus-trap')
    trap = mod.createFocusTrap(el, {
      escapeDeactivates: false,
      clickOutsideDeactivates: true,
      // Focus the dialog CONTAINER on open, not the first tabbable (which is
      // the drag grabber) — otherwise opening via drag/click paints the
      // grabber's focus ring (a circle at the top). The container is
      // tabindex="-1" + outline:none, so this is the standard ARIA-dialog
      // pattern; keyboard users still Tab to the grabber and see its ring.
      initialFocus: () => drawerEl.value ?? false,
      // Transient layouts can leave no tabbable element momentarily — fall back
      // to the drawer root. A function keeps it valid even if the ref changes.
      fallbackFocus: () => drawerEl.value ?? el,
      returnFocusOnDeactivate: true
    })
  } catch {
    trap = null
  }
  return trap
}
watch(isOpen, async (open) => {
  if (open) {
    const t = await ensureTrap()
    // Guard: the element may have detached (e.g. unmount) before activation.
    if (t && drawerEl.value?.isConnected) {
      try {
        t.activate()
      } catch {
        /* focus-trap may throw if no focusable node yet — non-fatal */
      }
    }
  } else {
    try {
      trap?.deactivate()
    } catch {
      /* non-fatal */
    }
  }
})

onMounted(() => {
  if (typeof document !== 'undefined') {
    document.addEventListener('keydown', onKeydown)
  }
})
onBeforeUnmount(() => {
  if (bounceTimer !== null) clearTimeout(bounceTimer)
  expireWatcher?.stop()
  trap?.deactivate()
  if (typeof document !== 'undefined') {
    document.removeEventListener('keydown', onKeydown)
    document.documentElement.style.removeProperty('--cart-drawer-height')
    document.body.style.overflow = ''
  }
})

const checkoutUrl = computed(() =>
  details.value ? props.cart.checkoutUrl(details.value) : null
)
function handleCheckout() {
  if (checkoutUrl.value) props.onNavigate(checkoutUrl.value)
}

// Open-state "Browse events" in `event` context. The target is the
// package-built, collectionId-derived, isSafeRelativePath-validated
// `effectiveBrowseHref` — never a consumer-supplied URL — so this can't be
// turned into an open redirect. (`collection` context closes instead and never
// reaches here.)
function handleBrowse() {
  props.onNavigate(effectiveBrowseHref.value)
}

const overlayOpacity = computed(() => progress.value)
const contentOpacity = computed(() =>
  Math.max(0, Math.min(1, (progress.value - 0.3) / 0.7))
)
</script>

<template>
  <template v-if="collectionId && (summary || details)">
    <!-- The docked cart hides once the hold expires — only the blocking expired
         modal remains; the stale cart 404s on the next fetch. -->
    <template v-if="!expired">
      <!-- Dark overlay — fades in with drag progress. -->
      <div
        aria-hidden="true"
        class="rc-overlay"
        :class="{
          'rc-overlay--open': isOpen,
          'rc-overlay--dragging': isDragging
        }"
        :style="{ opacity: overlayOpacity }"
        @click="toggle"
      />

      <!-- Drawer — floating card. -->
      <div
        ref="drawerEl"
        id="cart-drawer"
        class="rc-drawer"
        tabindex="-1"
        :class="{ 'rc-drawer--dragging': isDragging }"
        :role="isOpen ? 'dialog' : 'region'"
        :aria-modal="isOpen ? 'true' : undefined"
        :aria-labelledby="isOpen ? cartHeadingId : undefined"
        :aria-label="isOpen ? undefined : 'Cart summary'"
        :style="{ height: `${dragHeight}px` }"
      >
        <CartDrawerHeader
          :ref="bindHeader"
          :ticket-count="displayTicketCount"
          :cart-total="displayTotal"
          :expires-at-utc="expiresAtUtc"
          :locale="locale"
          :currency="currency"
          :is-open="isOpen"
          :bounce="bounce"
          :progress="progress"
          :title-id="cartHeadingId"
          @toggle="toggle"
          @drag-start="handleDragStart"
        />

        <div
          id="cart-drawer-body"
          class="rc-drawer__body"
          :style="{
            opacity: contentOpacity,
            pointerEvents: isOpen ? 'auto' : 'none'
          }"
        >
          <p
            v-if="detailsError"
            class="rc-drawer__error rc-intent-danger"
            role="status"
          >
            Couldn't load your cart. Please try again.
          </p>
          <CartContents
            v-else-if="details"
            :cart="details"
            :on-navigate="onNavigate"
            :browse-href="effectiveBrowseHref"
            :checkout-url="checkoutUrl"
            :locale="locale"
            :currency="currency"
            hide-footer
          />
          <div
            v-else-if="detailsLoading"
            class="rc-drawer__loading"
            data-testid="cart-drawer-loading"
          >
            <div class="rc-skeleton rc-skeleton--line" />
            <div class="rc-skeleton rc-skeleton--block" />
            <div class="rc-skeleton rc-skeleton--block" />
          </div>
        </div>

        <CartDrawerFooter
          :ref="bindFooter"
          :cart-total="displayTotal"
          :booking-fees="displayBookingFees"
          :locale="locale"
          :currency="currency"
          :is-open="isOpen"
          :progress="progress"
          :checkout-disabled="!checkoutUrl"
          :context="context"
          @toggle="toggle"
          @checkout="handleCheckout"
          @browse="handleBrowse"
          @drag-start="handleDragStart"
        />
      </div>
    </template>

    <CartExpiryModals
      :show-warning="showWarning"
      :expired="expired"
      :remaining="remaining"
      :on-dismiss-warning="dismissWarning"
      :checkout-url="checkoutUrl"
      :browse-href="effectiveBrowseHref"
      :on-navigate="onNavigate"
    />
  </template>
</template>
