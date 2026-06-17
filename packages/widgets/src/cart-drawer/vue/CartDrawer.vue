<script setup lang="ts">
import { PhCircleNotch } from '@phosphor-icons/vue'
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

function resolveRootEl(
  el: Element | ComponentPublicInstance | null
): HTMLElement | null {
  if (el instanceof HTMLElement) return el
  const root = (el as ComponentPublicInstance | null)?.$el
  return root instanceof HTMLElement ? root : null
}

// Only accept a consumer browseHref if it's a safe relative path — else a tainted host value could reach onNavigate.
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

// Stable ref callbacks MUST keep constant identity — an inline arrow re-fires every render → ResizeObserver re-observe loop that freezes the tab.
const bindHeader = (el: Element | ComponentPublicInstance | null): void => {
  setHeaderElement(resolveRootEl(el))
}
const bindFooter = (el: Element | ComponentPublicInstance | null): void => {
  setFooterElement(resolveRootEl(el))
}

const isOpen = computed(() => state.value === 'open')

watch(state, (next, prev) => {
  if (next !== prev) props.onOpenChange?.(next === 'open')
})

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

watch(
  closedHeight,
  (h) => {
    props.onHeightChange?.(h)
    if (typeof document === 'undefined') return
    document.documentElement.style.setProperty('--cart-drawer-height', `${h}px`)
  },
  { immediate: true }
)

// Body scroll lock when open — refcounted via documentEffects so drawer + expiry modals don't clobber each other's lock.
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

function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape' || !isOpen.value) return
  if (document.querySelector('[data-cart-confirm]')) return
  toggle()
}

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
      initialFocus: () => drawerEl.value ?? false,
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
    if (t && drawerEl.value?.isConnected) {
      try {
        t.activate()
      } catch {
        /* non-fatal */
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

// Navigates to the validated effectiveBrowseHref only — never a consumer URL — so it can't become an open redirect.
function handleBrowse() {
  props.onNavigate(effectiveBrowseHref.value)
}

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
    <div
      aria-hidden="true"
      class="fixed inset-0 z-70 emphasis-overlay transition-opacity duration-300 ease-out"
      :class="[
        isOpen ? 'pointer-events-auto' : 'pointer-events-none',
        isDragging && 'transition-none'
      ]"
      :style="{ opacity: overlayOpacity }"
      @click="toggle"
    />

    <div
      ref="drawerEl"
      id="cart-drawer"
      class="animate-cart-pop-in fixed z-70 flex flex-col overflow-hidden emphasis-floating [transition:height_320ms_cubic-bezier(0.22,1,0.36,1),border-radius_300ms_var(--ease-out),inset_300ms_var(--ease-out)] focus:outline-none sm:inset-x-4 sm:bottom-4 sm:mx-auto sm:max-w-[600px] sm:rounded-4xl"
      tabindex="-1"
      :class="[
        isOpen
          ? 'inset-x-0 bottom-0 rounded-t-4xl'
          : 'inset-x-3 bottom-3 rounded-3xl',
        isDragging && 'transition-none'
      ]"
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
        class="h-full min-h-0 flex-1 overflow-y-auto px-4 transition-opacity"
        :aria-busy="removing"
        :inert="!isOpen"
        :style="{
          opacity: contentOpacity,
          pointerEvents: isOpen ? 'auto' : 'none'
        }"
      >
        <p
          v-if="detailsError"
          class="text-prose text-subtle intent-danger"
          role="status"
        >
          Couldn't load your cart. Please try again.
        </p>
        <template v-else-if="details">
          <p
            v-if="removeError"
            class="text-ui-meta text-subtle intent-danger"
            role="alert"
          >
            {{ removeError }}
          </p>
          <div class="relative">
            <div :class="{ 'pointer-events-none opacity-50': removing }">
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
            </div>
            <div
              v-if="removing"
              class="pointer-events-none absolute inset-0 grid place-content-center"
              aria-hidden="true"
              data-testid="cart-remove-spinner"
            >
              <PhCircleNotch
                weight="bold"
                :class="'size-6 animate-spin text-subtle'"
                aria-hidden="true"
              />
            </div>
          </div>
        </template>
        <div
          v-else-if="detailsLoading"
          class="grid gap-4"
          data-testid="cart-drawer-loading"
        >
          <div class="h-4 w-40 animate-pulse rounded bg-subtle" />
          <div class="h-32 w-full animate-pulse rounded-xl bg-subtle" />
          <div class="h-32 w-full animate-pulse rounded-xl bg-subtle" />
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
