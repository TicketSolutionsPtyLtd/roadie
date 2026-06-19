<script setup lang="ts">
import { PhBag } from '@phosphor-icons/vue'

const props = defineProps<{
  /** App-specific browse target. */
  browseHref: string
  onNavigate: (href: string) => void
}>()
</script>

<template>
  <!-- Hand-port of the Roadie EmptyState compound (size sm) — class strings
       copied from packages/components/src/components/EmptyState. -->
  <div
    data-slot="empty-state"
    class="grid justify-items-center gap-4 py-8 text-center"
  >
    <div
      data-slot="empty-state-icon-tile"
      class="inline-flex size-14 items-center justify-center rounded-full emphasis-subtle p-3 text-subtle [&_svg]:size-8 [&_svg]:shrink-0"
    >
      <PhBag weight="duotone" aria-hidden="true" />
    </div>
    <h2
      data-slot="empty-state-title"
      class="text-display-ui-5 text-balance text-strong"
    >
      Your cart is empty
    </h2>
    <p
      data-slot="empty-state-description"
      class="max-w-sm text-sm/prose tracking-prose text-pretty text-subtle [[data-slot=empty-state-title]+&]:-mt-3"
    >
      Browse events and add tickets to get started.
    </p>
    <div class="flex flex-wrap items-center justify-center gap-3">
      <button
        type="button"
        class="is-interactive btn btn-md emphasis-strong intent-brand"
        @click="props.onNavigate(props.browseHref)"
      >
        Browse events
      </button>
    </div>
  </div>
</template>
