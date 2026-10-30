<script setup lang="ts">
import NumberFlow from '@number-flow/vue'
import { PhBag, PhX } from '@phosphor-icons/vue'
import { computed } from 'vue'

import CartUrgencyBadge from '../../cart-contents/vue/CartUrgencyBadge.vue'
import { priceFormat } from '../../cart/price'

const props = defineProps<{
  ticketCount: number
  cartTotal: number
  expiresAtUtc: string | undefined
  locale: string
  currency: string
  isOpen: boolean
  bounce: boolean
  /** Drawer open progress 0..1. */
  progress: number
  titleId: string
}>()

const emit = defineEmits<{
  toggle: []
  dragStart: [e: PointerEvent]
}>()

const titleAreaHeight = computed(() => 32 + props.progress * 44)
const titleLeft = computed(() =>
  props.progress <= 0
    ? '16px'
    : `calc(${16 * (1 - props.progress)}px + ${props.progress * 50}%)`
)
const titleTransform = computed(() => `translateX(${-50 * props.progress}%)`)
const badgeTop = computed(() => props.progress * 36)
const priceOpacity = computed(() => 1 - props.progress)
const closeOpacity = computed(() =>
  Math.max(0, Math.min(1, (props.progress - 0.5) / 0.2))
)
const closeScale = computed(
  () => 0.8 + Math.max(0, Math.min(1, (props.progress - 0.5) / 0.2)) * 0.2
)

function onPointerDown(e: PointerEvent) {
  emit('dragStart', e)
}
function onGrabberClick(e: MouseEvent) {
  // detail === 0 = screen-reader / Enter-Space activation.
  if (e.detail === 0) emit('toggle')
}
function onGrabberKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    emit('toggle')
  }
}
</script>

<template>
  <div
    class="relative shrink-0 cursor-pointer touch-none select-none"
    :class="{ 'animate-nudge': bounce }"
    @pointerdown="onPointerDown"
  >
    <div class="flex justify-center pt-1 pb-1">
      <button
        type="button"
        class="is-interactive flex cursor-grab appearance-none items-center justify-center rounded-full bg-transparent px-3 py-1 active:cursor-grabbing"
        :aria-expanded="isOpen"
        aria-controls="cart-drawer-body"
        :aria-label="isOpen ? 'Close cart' : 'Open cart'"
        @click="onGrabberClick"
        @keydown="onGrabberKeydown"
      >
        <span aria-hidden="true" class="h-1.5 w-9 rounded-full bg-subtle" />
      </button>
    </div>

    <div class="relative" :style="{ height: `${titleAreaHeight}px` }">
      <div
        class="absolute top-0 left-4"
        :inert="!isOpen"
        :style="{
          opacity: closeOpacity,
          transform: `scale(${closeScale})`,
          pointerEvents: isOpen ? 'auto' : 'none'
        }"
        @pointerdown.stop
      >
        <button
          type="button"
          class="is-interactive btn btn-icon-sm emphasis-subtle intent-neutral"
          aria-label="Close cart"
          @click="emit('toggle')"
        >
          <PhX weight="bold" class="size-4" aria-hidden="true" />
        </button>
      </div>

      <div
        :id="titleId"
        class="absolute top-0 flex h-8 items-center gap-2"
        :style="{ left: titleLeft, transform: titleTransform }"
      >
        <PhBag
          weight="bold"
          class="size-5 text-subtle intent-accent"
          aria-hidden="true"
        />
        <span class="text-ui font-bold text-strong">Cart</span>
      </div>

      <div
        class="absolute left-1/2 flex h-8 -translate-x-1/2 items-center"
        :style="{ top: `${badgeTop}px` }"
      >
        <CartUrgencyBadge
          :ticket-count="ticketCount"
          :expires-at-utc="expiresAtUtc"
          :progress="isOpen ? 1 : 0"
          :bounce="bounce"
        />
      </div>

      <div
        class="absolute top-0 right-4 flex h-8 items-center"
        :style="{ opacity: priceOpacity }"
      >
        <span
          class="text-ui font-bold text-strong"
          data-testid="cart-header-price"
        >
          <NumberFlow
            :value="cartTotal"
            :locales="locale"
            :format="priceFormat(currency)"
          />
        </span>
      </div>
    </div>
  </div>
</template>
