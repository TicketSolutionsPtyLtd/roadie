<script setup lang="ts">
import { PhX } from '@phosphor-icons/vue'
import { onBeforeUnmount, onMounted, ref, useSlots } from 'vue'

import { lockBodyScroll } from './documentEffects'

// Vue has no roadie-components Dialog, so this mirrors the React Dialog compound
// (Header → Body → Footer, centred, gap-8) with Roadie utilities.
const props = withDefaults(
  defineProps<{
    titleId: string
    /** Sets the intent context the IconTile, description, and strong action inherit. */
    intent: 'warning' | 'danger'
    title: string
    description: string
    /** Light-dismiss via backdrop/Escape/close. */
    dismissible?: boolean
    onClose?: () => void
  }>(),
  { dismissible: false, onClose: undefined }
)
const slots = useSlots()

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
    /* non-fatal */
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
    class="fixed inset-0 z-alert grid place-items-center overflow-y-auto emphasis-overlay p-4"
    @click="onOverlayClick"
  >
    <div
      ref="panelEl"
      class="relative grid w-full max-w-sm gap-8 rounded-2xl emphasis-floating p-6 focus:outline-none"
      :class="`intent-${intent}`"
      role="alertdialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      tabindex="-1"
      @click.stop
    >
      <div class="relative grid gap-1.5 text-center">
        <button
          v-if="dismissible"
          type="button"
          class="is-interactive btn btn-icon-sm absolute top-0 right-0 emphasis-subtle intent-neutral"
          aria-label="Close"
          @click="onClose?.()"
        >
          <PhX weight="bold" class="size-4" aria-hidden="true" />
        </button>
        <div
          class="inline-flex size-16 items-center justify-center justify-self-center rounded-full emphasis-subtle [&_svg]:size-9"
        >
          <slot name="icon" />
        </div>
        <h2 :id="titleId" class="text-display-ui-4 text-strong">{{ title }}</h2>
        <p class="text-subtle">{{ description }}</p>
      </div>
      <div
        v-if="slots.body"
        class="grid justify-items-center gap-3 text-center"
      >
        <slot name="body" />
      </div>
      <div class="flex justify-center gap-2"><slot name="actions" /></div>
    </div>
  </div>
</template>
