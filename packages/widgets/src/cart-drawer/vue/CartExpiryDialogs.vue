<script setup lang="ts">
import NumberFlow from '@number-flow/vue'
import { PhClock } from '@phosphor-icons/vue'
import { computed, useId } from 'vue'

import CartExpiryDialog from './CartExpiryDialog.vue'

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
  <CartExpiryDialog
    v-if="showWarning && !expired"
    :title-id="warningTitleId"
    intent="warning"
    title="Still here?"
    description="Your tickets are held for a little longer. Check out now to secure them."
    dismissible
    :on-close="onDismissWarning"
  >
    <template #icon>
      <PhClock weight="duotone" aria-hidden="true" />
    </template>
    <template #body>
      <span class="text-display-ui-4 text-[var(--intent-9)] tabular-nums">
        <NumberFlow :value="minutes" />:<NumberFlow
          :value="seconds"
          :format="PAD2_FORMAT"
        />
      </span>
    </template>
    <template #actions>
      <!-- No intent — inherits the dialog's warning via the cascade. -->
      <button
        type="button"
        class="is-interactive btn btn-md emphasis-normal"
        @click="onDismissWarning"
      >
        Keep browsing
      </button>
      <button
        type="button"
        class="is-interactive btn btn-md emphasis-strong"
        :disabled="!checkoutUrl"
        @click="checkout"
      >
        Checkout
      </button>
    </template>
  </CartExpiryDialog>

  <!-- Blocking; no dismiss — the only exit is back to browsing. -->
  <CartExpiryDialog
    v-if="expired"
    :title-id="expiredTitleId"
    intent="danger"
    title="Your hold has ended"
    description="Your tickets are no longer being held. Head back to browse and grab them again."
  >
    <template #icon>
      <PhClock weight="duotone" aria-hidden="true" />
    </template>
    <template #actions>
      <!-- Accent CTA against the danger framing — the way forward. -->
      <button
        type="button"
        class="is-interactive btn btn-md emphasis-strong intent-accent"
        @click="browse"
      >
        Browse events
      </button>
    </template>
  </CartExpiryDialog>
</template>
