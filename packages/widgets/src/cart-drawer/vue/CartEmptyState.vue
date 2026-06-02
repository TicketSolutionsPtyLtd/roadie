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
    <div class="rc-empty__icon">
      <svg
        class="rc-empty__icon-graphic"
        viewBox="0 0 256 256"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          d="M216,64H176a48,48,0,0,0-96,0H40A16,16,0,0,0,24,80V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V80A16,16,0,0,0,216,64ZM128,32a32,32,0,0,1,32,32H96A32,32,0,0,1,128,32Zm88,168H40V80H216V200Z"
        />
      </svg>
    </div>
    <h2 class="rc-empty__heading">Your cart is empty</h2>
    <p class="rc-empty__text">Browse events and add tickets to get started.</p>
    <button
      type="button"
      class="rc-button rc-button--strong rc-intent-brand"
      @click="props.onNavigate(props.browseHref)"
    >
      Browse Events
    </button>
  </div>
</template>
