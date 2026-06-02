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
          d="M216,60H179.83A52,52,0,0,0,76.17,60H40A20,20,0,0,0,20,80V200a20,20,0,0,0,20,20H216a20,20,0,0,0,20-20V80A20,20,0,0,0,216,60ZM128,36a28,28,0,0,1,27.71,24H100.29A28,28,0,0,1,128,36Zm84,160H44V84H76V96a12,12,0,0,0,24,0V84h56V96a12,12,0,0,0,24,0V84h32Z"
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
