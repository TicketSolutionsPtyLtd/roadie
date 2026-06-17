<script setup lang="ts">
import { PhBag } from '@phosphor-icons/vue'

const props = defineProps<{
  /** App-specific browse target. */
  browseHref: string
  onNavigate: (href: string) => void
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center px-6 py-16 text-center">
    <div
      class="mb-6 flex size-24 items-center justify-center rounded-full bg-subtle"
    >
      <PhBag weight="bold" class="size-10 text-subtler" aria-hidden="true" />
    </div>
    <h2 class="mb-2 text-display-ui-3 text-strong">Your cart is empty</h2>
    <p class="mb-6 max-w-xs text-prose text-balance text-subtle">
      Browse events and add tickets to get started.
    </p>
    <button
      type="button"
      class="is-interactive btn btn-lg emphasis-strong intent-brand"
      @click="props.onNavigate(props.browseHref)"
    >
      Browse Events
    </button>
  </div>
</template>
