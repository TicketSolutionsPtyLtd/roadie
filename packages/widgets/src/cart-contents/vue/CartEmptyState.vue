<script setup lang="ts">
import { PhBag } from '@phosphor-icons/vue'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    /** App-specific browse target. */
    browseHref: string
    onNavigate: (href: string) => void
    size?: 'sm' | 'md'
  }>(),
  { size: 'sm' }
)

// Hand-port of the Roadie EmptyState compound — class strings copied from
// packages/components/src/components/EmptyState (+ IconTile xl/2xl).
const cls = computed(() =>
  props.size === 'md'
    ? {
        root: 'gap-6 py-12',
        tile: 'size-16 p-3.5 [&_svg]:size-9',
        title: 'text-display-ui-3',
        description:
          'max-w-md text-base/prose [[data-slot=empty-state-title]+&]:-mt-4'
      }
    : {
        root: 'gap-4 py-8',
        tile: 'size-14 p-3 [&_svg]:size-8',
        title: 'text-display-ui-5',
        description:
          'max-w-sm text-sm/prose [[data-slot=empty-state-title]+&]:-mt-3'
      }
)
</script>

<template>
  <div
    data-slot="empty-state"
    class="grid justify-items-center text-center"
    :class="cls.root"
  >
    <div
      data-slot="empty-state-icon-tile"
      class="inline-flex items-center justify-center rounded-full emphasis-subtle text-subtle [&_svg]:shrink-0"
      :class="cls.tile"
    >
      <PhBag weight="duotone" aria-hidden="true" />
    </div>
    <h2
      data-slot="empty-state-title"
      class="text-balance text-strong"
      :class="cls.title"
    >
      Your cart is empty
    </h2>
    <p
      data-slot="empty-state-description"
      class="tracking-prose text-pretty text-subtle"
      :class="cls.description"
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
