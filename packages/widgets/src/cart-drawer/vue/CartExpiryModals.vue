<script setup lang="ts">
import NumberFlow from '@number-flow/vue'
import { PhClock } from '@phosphor-icons/vue'
import { computed, useId } from 'vue'

import CartExpiryModal from './CartExpiryModal.vue'

const props = defineProps<{
  showWarning: boolean
  expired: boolean
  /** Seconds remaining. */
  remaining: number | null
  onDismissWarning: () => void
  /** Checkout target; null while loading. */
  checkoutUrl: string | null
  /** Collection page target. */
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
</script>

<template>
  <CartExpiryModal
    v-if="showWarning && !expired"
    :title-id="warningTitleId"
    title="Still here?"
    dismissible
    :on-close="onDismissWarning"
  >
    <template #icon>
      <div
        class="flex size-14 items-center justify-center rounded-full bg-subtle"
      >
        <PhClock
          weight="bold"
          class="size-7 text-[var(--intent-9)] intent-danger"
          aria-hidden="true"
        />
      </div>
    </template>
    <template #body>
      Your tickets are held for a little longer. Check out now to secure them.
      <span
        class="mt-2 block text-display-ui-4 text-[var(--intent-9)] tabular-nums intent-danger"
      >
        <NumberFlow :value="minutes" />:<NumberFlow
          :value="seconds"
          :format="PAD2_FORMAT"
        />
      </span>
    </template>
    <template #actions>
      <button
        type="button"
        class="is-interactive btn btn-md flex-1 emphasis-normal intent-neutral"
        @click="onDismissWarning"
      >
        Keep browsing
      </button>
      <button
        type="button"
        class="is-interactive btn btn-md flex-1 emphasis-strong intent-danger"
        :disabled="!checkoutUrl"
        @click="checkout"
      >
        Checkout
      </button>
    </template>
  </CartExpiryModal>

  <!-- Blocking; no dismiss — the only exit is back to browsing. -->
  <CartExpiryModal
    v-if="expired"
    :title-id="expiredTitleId"
    title="Your hold has ended"
  >
    <template #icon>
      <div
        class="flex size-16 items-center justify-center rounded-full bg-subtle"
      >
        <PhClock weight="bold" class="size-8 text-subtler" aria-hidden="true" />
      </div>
    </template>
    <template #body>
      Your tickets are no longer being held. Head back to browse and grab them
      again.
    </template>
    <template #actions>
      <button
        type="button"
        class="is-interactive btn btn-md flex-1 emphasis-strong intent-accent"
        @click="browse"
      >
        Browse events
      </button>
    </template>
  </CartExpiryModal>
</template>
