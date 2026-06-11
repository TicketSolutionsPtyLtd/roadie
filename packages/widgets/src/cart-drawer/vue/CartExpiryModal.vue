<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

// Accessible shell (rc-* styles): role=dialog + focus trap + Escape +
// save/restore body-scroll-lock (composes with the drawer's). Parent v-ifs it in
// and out, so mounted === open.
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
let prevOverflow = ''
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
    prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
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
    document.body.style.overflow = prevOverflow
  }
})
</script>

<template>
  <div class="rc-modal-overlay" @click="onOverlayClick">
    <div
      ref="panelEl"
      class="rc-modal"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      tabindex="-1"
      @click.stop
    >
      <div v-if="dismissible" class="rc-modal__close">
        <button
          type="button"
          class="rc-icon-button"
          aria-label="Close"
          @click="onClose?.()"
        >
          <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
            <path
              d="M208.49,191.51a12,12,0,0,1-17,17L128,145,64.49,208.49a12,12,0,0,1-17-17L111,128,47.51,64.49a12,12,0,0,1,17-17L128,111l63.51-63.52a12,12,0,0,1,17,17L145,128Z"
            />
          </svg>
        </button>
      </div>
      <slot name="icon" />
      <h2 :id="titleId" class="rc-modal__title">{{ title }}</h2>
      <div class="rc-modal__body"><slot name="body" /></div>
      <div class="rc-modal__actions"><slot name="actions" /></div>
    </div>
  </div>
</template>
