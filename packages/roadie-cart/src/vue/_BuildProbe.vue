<script setup lang="ts">
// Temporary probe to verify the Vue SFC build wiring (template compile + dts).
// Styles ship via a hand-authored stylesheet copied to dist/vue/style.css —
// tsdown 0.21.7's CSS pipeline (@tsdown/css) is unavailable on this Node, so
// SFC `<style>` blocks are not used; class names target the shared stylesheet.
</script>

<template>
  <div class="roadie-cart-probe" />
</template>
