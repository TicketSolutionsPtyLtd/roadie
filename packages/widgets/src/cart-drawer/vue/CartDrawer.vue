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
  isSafeRelativePath
} from '../core'
import CartContents from './CartContents.vue'
import CartDrawerFooter from './CartDrawerFooter.vue'
import CartDrawerHeader from './CartDrawerHeader.vue'
import { lockBodyScroll } from './documentEffects'
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

const { summary, details, detailsLoading, detailsError, refresh } = useCart(
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

// --- Expiry watch: fire onExpire once (core watcher's latch resets on change) ---
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
// Refcounted via documentEffects so the drawer and the expiry modals compose:
// whichever opens/closes first no longer clobbers the other's lock (re-enabling
// background scroll while one is still open). Acquire once on entering the
// locked state, release on leaving it (and on unmount).
let releaseScrollLock: (() => void) | null = null
watch(
  [() => props.lockBodyScroll, isOpen],
  ([lock, open]) => {
    if (lock && open) {
      releaseScrollLock ??= lockBodyScroll()
    } else {
      releaseScrollLock?.()
      releaseScrollLock = null
    }
  },
  { immediate: true }
)

// --- Escape closes ---
function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape' || !isOpen.value) return
  // A confirm popover is open — let it consume Escape; don't ALSO close the
  // whole drawer (both listeners sit on document; the drawer must defer).
  if (document.querySelector('.rc-confirm')) return
  toggle()
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
  releaseScrollLock?.()
  releaseScrollLock = null
  if (typeof document !== 'undefined') {
    document.removeEventListener('keydown', onKeydown)
    document.documentElement.style.removeProperty('--cart-drawer-height')
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

// --- Remove an entire event from the cart (INNO-377) ---
// Non-optimistic + "lock the whole cart": no row removal, no useMutation. The
// server write path is last-writer-wins, so a single in-flight remove is
// required (the lock enforces it). Flow: lock → await cart.removeItem (204, no
// body) → refresh the reads (the existing empty-cart rendering covers the
// last-event case) → unlock. On a thrown error keep the rows + surface it.
const removing = ref(false)
const removeError = ref<string | null>(null)
async function handleRemoveEvent(eventId: string) {
  if (removing.value || !details.value) return
  removing.value = true
  removeError.value = null
  try {
    await props.cart.removeItem(details.value.cartId, eventId)
    await refresh()
  } catch (err) {
    removeError.value =
      err instanceof Error ? err.message : 'Could not remove this event.'
  } finally {
    removing.value = false
  }
}

const overlayOpacity = computed(() => progress.value)
const contentOpacity = computed(() =>
  Math.max(0, Math.min(1, (progress.value - 0.3) / 0.7))
)
</script>

<template>
  <template v-if="collectionId && (summary || details)">
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
        :aria-busy="removing"
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
        <template v-else-if="details">
          <p
            v-if="removeError"
            class="rc-drawer__error rc-intent-danger"
            role="alert"
          >
            {{ removeError }}
          </p>
          <!-- Lock the WHOLE cart while a remove is in flight: dim + disable
               pointers on the content, overlay a spinner. -->
          <div class="rc-lock" :class="{ 'rc-lock--busy': removing }">
            <CartContents
              :cart="details"
              :on-navigate="onNavigate"
              :browse-href="effectiveBrowseHref"
              :checkout-url="checkoutUrl"
              :locale="locale"
              :currency="currency"
              :busy="removing"
              hide-footer
              @remove-event="handleRemoveEvent"
            />
            <div
              v-if="removing"
              class="rc-lock__overlay"
              aria-hidden="true"
              data-testid="cart-remove-spinner"
            >
              <svg
                class="rc-spinner"
                viewBox="0 0 256 256"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  d="M232,128a104,104,0,0,1-208,0c0-41,23.81-78.36,60.66-95.27a8,8,0,0,1,6.68,14.54C60.15,61.59,40,93.27,40,128a88,88,0,0,0,176,0c0-34.73-20.15-66.41-51.34-80.73a8,8,0,0,1,6.68-14.54C208.19,49.64,232,87,232,128Z"
                />
              </svg>
            </div>
          </div>
        </template>
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
</template>
