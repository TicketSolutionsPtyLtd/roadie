<script setup lang="ts">
import { PhX } from '@phosphor-icons/vue'
import { onBeforeUnmount, onMounted, ref } from 'vue'

import { lockBodyScroll } from './documentEffects'

// Accessible shell (Roadie utilities): role=dialog + focus trap + Escape +
// refcounted body-scroll-lock (shared with the drawer via documentEffects, so
// the two compose — see that module). Parent v-ifs it in and out, so
// mounted === open.
const props = withDefaults(
  defineProps<{
    titleId: string
    title: string
    /** Light-dismiss (backdrop/Escape/close); off for the blocking expired modal. */
    dismissible?: boolean
    onClose?: () => void
  }>(),
  { dismissible: false, onClose: undefined }
)

const panelEl = ref<HTMLElement | null>(null)
let releaseScrollLock: (() => void) | null = null
type FocusTrapInstance = { activate: () => void; deactivate: () => void }
let trap: FocusTrapInstance | null = null

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.dismissible) props.onClose?.()
}
function onOverlayClick() {
  if (props.dismissible) props.onClose?.()
}

onMounted(async () => {
  if (typeof document !== 'undefined') {
    releaseScrollLock = lockBodyScroll()
    document.addEventListener('keydown', onKeydown)
  }
  const el = panelEl.value
  if (!el) return
  try {
    const mod = await import('focus-trap')
    trap = mod.createFocusTrap(el, {
      escapeDeactivates: false,
      clickOutsideDeactivates: false,
      initialFocus: () => panelEl.value ?? false,
      fallbackFocus: () => panelEl.value ?? el,
      returnFocusOnDeactivate: true
    })
    if (panelEl.value?.isConnected) trap.activate()
  } catch {
    trap = null
  }
})

onBeforeUnmount(() => {
  try {
    trap?.deactivate()
  } catch {
    /* focus-trap may throw if nothing was focusable — non-fatal */
  }
  if (typeof document !== 'undefined') {
    document.removeEventListener('keydown', onKeydown)
    releaseScrollLock?.()
    releaseScrollLock = null
  }
})
</script>

<template>
  <div
    class="fixed inset-0 z-80 flex items-center justify-center emphasis-overlay p-4"
    @click="onOverlayClick"
  >
    <div
      ref="panelEl"
      class="relative grid w-full max-w-sm justify-items-center gap-4 rounded-4xl emphasis-floating p-6 text-center focus:outline-none"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      tabindex="-1"
      @click.stop
    >
      <div v-if="dismissible" class="absolute top-4 right-4">
        <button
          type="button"
          class="btn-icon is-interactive btn-icon-sm emphasis-subtle intent-neutral"
          aria-label="Close"
          @click="onClose?.()"
        >
          <PhX weight="bold" class="size-4" aria-hidden="true" />
        </button>
      </div>
      <slot name="icon" />
      <h2 :id="titleId" class="text-display-ui-4 text-strong">{{ title }}</h2>
      <div class="text-prose text-balance text-subtle">
        <slot name="body" />
      </div>
      <div class="flex w-full gap-3"><slot name="actions" /></div>
    </div>
  </div>
</template>
