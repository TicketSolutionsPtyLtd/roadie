<script setup lang="ts">
import { ref } from 'vue'

import { CartDrawer } from '@oztix/roadie-widgets/cart-drawer/vue'

import { collectionId, mockCart } from './mockCart'

// onNavigate is REQUIRED — routing is the consumer's job (no silent no-op).
function onNavigate(href: string): void {
  // eslint-disable-next-line no-console
  console.log('[harness] onNavigate ->', href)
  // eslint-disable-next-line no-alert
  window.alert(`onNavigate -> ${href}`)
}

// Toggle `.dark` on <html> so the drawer (rendered to body) re-themes.
const isDark = ref(false)
function toggleDark(): void {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
}
</script>

<template>
  <!-- Toolbar sits above the drawer's z-70 overlay. -->
  <div
    class="fixed top-4 left-4 z-[100] flex items-center gap-3 rounded-xl emphasis-raised px-3 py-2"
  >
    <span class="text-ui-meta font-bold text-strong">Cart drawer harness</span>
    <button
      type="button"
      class="is-interactive btn btn-sm emphasis-normal intent-neutral"
      @click="toggleDark"
    >
      {{ isDark ? 'Light mode' : 'Dark mode' }}
    </button>
  </div>

  <main class="grid min-h-dvh place-content-center gap-2 p-8 text-center">
    <h1 class="text-display-ui-3 text-strong">Roadie Cart Drawer</h1>
    <p class="text-subtle">
      Vue skin rendering with full Roadie/Tailwind styling. The drawer is open
      below — scroll it, try the trash buttons, and flip dark mode.
    </p>
  </main>

  <CartDrawer
    :cart="mockCart"
    :collection-id="collectionId"
    :on-navigate="onNavigate"
    browse-href="/events"
    locale="en-AU"
    currency="AUD"
    initial-state="open"
  />
</template>
