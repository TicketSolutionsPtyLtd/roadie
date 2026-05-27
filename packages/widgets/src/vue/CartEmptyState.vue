<script setup lang="ts">
// Plain button + onNavigate — no router import. Routing is the consumer's job.
const props = defineProps<{
  /** App-specific browse target (replaces the website's hardcoded route). */
  browseHref: string
  onNavigate: (href: string) => void
}>()
</script>

<template>
  <div class="rc-empty">
    <p class="rc-empty__text">Your cart is empty.</p>
    <button
      type="button"
      class="rc-button rc-button--strong rc-intent-brand"
      @click="props.onNavigate(props.browseHref)"
    >
      Browse Events
    </button>
  </div>
</template>
