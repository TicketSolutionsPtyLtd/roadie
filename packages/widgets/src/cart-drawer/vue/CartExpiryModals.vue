<script setup lang="ts">
import NumberFlow from '@number-flow/vue'
import { computed, useId } from 'vue'

import CartExpiryModal from './CartExpiryModal.vue'

const props = defineProps<{
  showWarning: boolean
  expired: boolean
  /** Seconds remaining — drives the warning's live countdown. */
  remaining: number | null
  onDismissWarning: () => void
  /** Checkout target for the warning's primary action; null while loading. */
  checkoutUrl: string | null
  /** Collection page — the expired modal's only exit. */
  browseHref: string
  onNavigate: (href: string) => void
}>()

const warningTitleId = useId()
const expiredTitleId = useId()
const PAD2_FORMAT = { minimumIntegerDigits: 2 }
const minutes = computed(() => Math.floor((props.remaining ?? 0) / 60))
const seconds = computed(() => (props.remaining ?? 0) % 60)

function checkout() {
  if (props.checkoutUrl) props.onNavigate(props.checkoutUrl)
}
function browse() {
  props.onNavigate(props.browseHref)
}

// Phosphor Clock icon (reused from CartEventGroup.vue) for both modals.
const CLOCK_PATH =
  'M128,20A108,108,0,1,0,236,128,108.12,108.12,0,0,0,128,20Zm0,192a84,84,0,1,1,84-84A84.09,84.09,0,0,1,128,212Zm68-84a12,12,0,0,1-12,12H128a12,12,0,0,1-12-12V72a12,12,0,0,1,24,0v44h44A12,12,0,0,1,196,128Z'
</script>

<template>
  <!-- Close-to-expiry warning — light-dismiss nudge. -->
  <CartExpiryModal
    v-if="showWarning && !expired"
    :title-id="warningTitleId"
    title="Still here?"
    dismissible
    :on-close="onDismissWarning"
  >
    <template #icon>
      <div class="rc-modal__icon rc-modal__icon--warning">
        <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
          <path :d="CLOCK_PATH" />
        </svg>
      </div>
    </template>
    <template #body>
      Your tickets are held for a little longer. Check out now to secure them.
      <span class="rc-modal__countdown tabular-nums">
        <NumberFlow :value="minutes" />:<NumberFlow
          :value="seconds"
          :format="PAD2_FORMAT"
        />
      </span>
    </template>
    <template #actions>
      <button
        type="button"
        class="rc-button rc-button--normal rc-intent-neutral"
        @click="onDismissWarning"
      >
        Keep browsing
      </button>
      <button
        type="button"
        class="rc-button rc-button--strong rc-intent-accent"
        :disabled="!checkoutUrl"
        @click="checkout"
      >
        Checkout
      </button>
    </template>
  </CartExpiryModal>

  <!-- Expired — blocking; the only exit is back to browsing. -->
  <CartExpiryModal
    v-if="expired"
    :title-id="expiredTitleId"
    title="Your hold has ended"
  >
    <template #icon>
      <div class="rc-modal__icon rc-modal__icon--expired">
        <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
          <path :d="CLOCK_PATH" />
        </svg>
      </div>
    </template>
    <template #body>
      Your tickets are no longer being held. Head back to browse and grab them
      again.
    </template>
    <template #actions>
      <button
        type="button"
        class="rc-button rc-button--strong rc-intent-accent"
        @click="browse"
      >
        Browse events
      </button>
    </template>
  </CartExpiryModal>
</template>
