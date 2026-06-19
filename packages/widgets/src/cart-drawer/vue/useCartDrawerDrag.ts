import { type AnimationPlaybackControls, animate } from 'motion'
import {
  type ComputedRef,
  type Ref,
  computed,
  onMounted,
  onScopeDispose,
  ref,
  watch
} from 'vue'

import {
  MEASURE_PROGRESS_MAX,
  MOBILE_OPEN_TOP_INSET_PX,
  TAP_PX,
  VIEWPORT_MARGIN_PX,
  decideSnapTarget
} from '../../cart'

export type UseCartDrawerDragReturn = {
  state: Ref<'open' | 'closed'>
  setState: (next: 'open' | 'closed') => void
  toggle: () => void
  /** Live drawer height in px. */
  dragHeight: Ref<number>
  /** 0 at closedHeight → 1 at maxHeight. */
  progress: ComputedRef<number>
  /** Measured header height in px. */
  headerHeight: Ref<number>
  /** Measured footer height in px. */
  footerHeight: Ref<number>
  /** The docked (closed) drawer height. */
  closedHeight: ComputedRef<number>
  /** Viewport-derived open height in px. */
  maxHeight: Ref<number>
  /** True while a pointer drag is in progress. */
  isDragging: Ref<boolean>
  /** Whether the user prefers reduced motion. */
  reducedMotion: Ref<boolean>
  /** Template refs to wire onto the header / footer elements for measurement. */
  setHeaderElement: (el: HTMLElement | null) => void
  setFooterElement: (el: HTMLElement | null) => void
  /** Begin a drag from the drag region's pointerdown. */
  handleDragStart: (e: PointerEvent) => void
}

type Options = {
  initialState?: 'open' | 'closed'
}

function computeViewportMaxHeight(): number {
  if (typeof window === 'undefined') return 0
  if (window.innerWidth < 640) {
    // clientHeight is what `position: fixed` is measured against.
    const layoutH = document.documentElement.clientHeight || window.innerHeight
    return Math.max(0, layoutH - MOBILE_OPEN_TOP_INSET_PX)
  }
  const vh = window.visualViewport?.height ?? window.innerHeight
  return Math.max(0, vh - VIEWPORT_MARGIN_PX)
}

export function useCartDrawerDrag(opts: Options = {}): UseCartDrawerDragReturn {
  const initialState = opts.initialState ?? 'closed'
  const state = ref<'open' | 'closed'>(initialState)

  const headerHeight = ref(53)
  const footerHeight = ref(64)
  const closedHeight = computed(() => headerHeight.value + footerHeight.value)
  const maxHeight = ref(computeViewportMaxHeight())
  const isDragging = ref(false)
  const motionQuery =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null
  const reducedMotion = ref(motionQuery?.matches ?? false)
  const onMotionChange = (e: MediaQueryListEvent) => {
    reducedMotion.value = e.matches
  }

  const dragHeight = ref(
    initialState === 'open' ? maxHeight.value : closedHeight.value
  )

  // Spring the height like the React skin (same damping/stiffness) instead of
  // an instant set + CSS transition. Driving the ref each frame means `progress`
  // — and every progress-derived surface — ramps with the spring rather than
  // snapping 0↔1 on toggle.
  let heightAnim: AnimationPlaybackControls | null = null
  const stopHeightAnim = () => {
    heightAnim?.stop()
    heightAnim = null
  }
  const animateHeightTo = (target: number) => {
    stopHeightAnim()
    if (reducedMotion.value) {
      dragHeight.value = target
      return
    }
    heightAnim = animate(dragHeight.value, target, {
      type: 'spring',
      damping: 30,
      stiffness: 300,
      onUpdate: (v) => {
        dragHeight.value = v
      },
      onComplete: () => {
        heightAnim = null
      }
    })
  }

  const progress = computed(() => {
    const span = maxHeight.value - closedHeight.value
    if (span <= 0) return state.value === 'open' ? 1 : 0
    const p = (dragHeight.value - closedHeight.value) / span
    return Math.max(0, Math.min(1, p))
  })

  // Reconcile the rested height to measurement/viewport changes while idle.
  // Toggle (snapTo) and drag own the height otherwise, so skip mid-drag/anim.
  watch([closedHeight, maxHeight], () => {
    if (isDragging.value || heightAnim) return
    dragHeight.value =
      state.value === 'open' ? maxHeight.value : closedHeight.value
  })

  // Gates re-entry and filters concurrent multi-touch pointers.
  let activePointerId: number | null = null
  // Detaches in-flight drag listeners so an unmount mid-drag doesn't leak them.
  let dragCleanup: (() => void) | null = null

  const isClosedEnoughToMeasure = () => progress.value < MEASURE_PROGRESS_MAX

  const readBlockSize = (entry: ResizeObserverEntry): number => {
    const bbox = entry.borderBoxSize?.[0]?.blockSize
    return typeof bbox === 'number'
      ? bbox
      : (entry.target as HTMLElement).getBoundingClientRect().height
  }

  const latestBlockSize = (entries: ResizeObserverEntry[]): number => {
    let next = 0
    for (const entry of entries) {
      const h = readBlockSize(entry)
      if (h > 0) next = h
    }
    return next
  }

  // Observer writes are deferred to rAF to avoid the synchronous relayout
  // that triggers the "ResizeObserver loop" warning.
  const createHeightTracker = (target: Ref<number>) => {
    let observer: ResizeObserver | null = null
    let observed: HTMLElement | null = null
    let pendingRaf: number | null = null

    const cancelRaf = () => {
      if (pendingRaf !== null) {
        cancelAnimationFrame(pendingRaf)
        pendingRaf = null
      }
    }

    const commit = (nextHeight: number) => {
      cancelRaf()
      pendingRaf = requestAnimationFrame(() => {
        pendingRaf = null
        if (isClosedEnoughToMeasure()) target.value = nextHeight
      })
    }

    const disconnect = () => {
      observer?.disconnect()
      observer = null
      observed = null
      cancelRaf()
    }

    // (Re)observe ONLY a genuinely new element — re-observing on every render
    // fires the callback and recurses into a freeze. Null teardown is handled
    // by disconnect() in onScopeDispose, so ignoring null calls won't leak.
    const setElement = (el: HTMLElement | null) => {
      if (el === observed || el === null) return
      observer?.disconnect()
      cancelRaf()
      observed = el
      if (typeof ResizeObserver === 'undefined') return
      // Seed synchronously so the first paint has a real measurement.
      if (isClosedEnoughToMeasure()) {
        const h = el.getBoundingClientRect().height
        if (h > 0) target.value = h
      }
      observer = new ResizeObserver((entries) => {
        if (!isClosedEnoughToMeasure()) return
        const nextHeight = latestBlockSize(entries)
        if (nextHeight > 0) commit(nextHeight)
      })
      observer.observe(el)
    }

    return { setElement, disconnect }
  }

  const headerTracker = createHeightTracker(headerHeight)
  const footerTracker = createHeightTracker(footerHeight)
  const setHeaderElement = headerTracker.setElement
  const setFooterElement = footerTracker.setElement

  const updateViewport = () => {
    maxHeight.value = computeViewportMaxHeight()
  }

  onMounted(() => {
    if (typeof window === 'undefined') return
    updateViewport()
    window.addEventListener('resize', updateViewport)
    window.visualViewport?.addEventListener('resize', updateViewport)
    motionQuery?.addEventListener('change', onMotionChange)
  })

  // onScopeDispose (not onBeforeUnmount) so cleanup also fires inside a standalone effectScope().
  onScopeDispose(() => {
    stopHeightAnim()
    headerTracker.disconnect()
    footerTracker.disconnect()
    dragCleanup?.()
    if (typeof window === 'undefined') return
    window.removeEventListener('resize', updateViewport)
    window.visualViewport?.removeEventListener('resize', updateViewport)
    motionQuery?.removeEventListener('change', onMotionChange)
  })

  // Imperative state set (no spring) — mirrors React's layout-effect snap.
  const setState = (next: 'open' | 'closed') => {
    state.value = next
    stopHeightAnim()
    dragHeight.value = next === 'open' ? maxHeight.value : closedHeight.value
  }

  const snapTo = (next: 'open' | 'closed') => {
    // Start the spring before flipping state so the sync reconcile watch sees an
    // in-flight animation and doesn't clobber it with an instant set.
    animateHeightTo(next === 'open' ? maxHeight.value : closedHeight.value)
    state.value = next
  }

  const toggle = () => {
    snapTo(state.value === 'open' ? 'closed' : 'open')
  }

  const handleDragStart = (e: PointerEvent) => {
    if (typeof window === 'undefined') return
    // Re-entry guard: honour only the first pointer to avoid duplicate listeners on multi-touch.
    if (activePointerId !== null) return
    const pointerId = e.pointerId
    activePointerId = pointerId

    const startY = e.clientY
    const startHeight = dragHeight.value
    const wasOpen = state.value === 'open'

    let lastClientY = startY
    let lastTime = Date.now()
    let velocity = 0
    isDragging.value = true
    // Hand the height over to the pointer — cancel any in-flight snap spring.
    stopHeightAnim()

    const detach = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      activePointerId = null
      dragCleanup = null
    }

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return
      const delta = startY - ev.clientY // positive = dragged up = opening
      dragHeight.value = Math.min(
        maxHeight.value,
        Math.max(closedHeight.value, startHeight + delta)
      )

      const now = Date.now()
      const dt = now - lastTime
      if (dt > 0) {
        velocity = ((lastClientY - ev.clientY) / dt) * 1000
      }
      lastClientY = ev.clientY
      lastTime = now
    }

    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return
      detach()
      isDragging.value = false

      const currentHeight = dragHeight.value
      const totalMove = Math.abs(currentHeight - startHeight)

      if (totalMove < TAP_PX) {
        snapTo(wasOpen ? 'closed' : 'open')
        return
      }

      // Core uses Y-position (up = negative); this hook tracks height (up = positive), so invert.
      const target = decideSnapTarget({
        velocity: -velocity,
        offset: -(currentHeight - startHeight),
        currentState: wasOpen ? 'open' : 'closed',
        openY: 0,
        closedY: maxHeight.value - closedHeight.value
      })
      snapTo(target)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    dragCleanup = detach
  }

  return {
    state,
    setState,
    toggle,
    dragHeight,
    progress,
    headerHeight,
    footerHeight,
    closedHeight,
    maxHeight,
    isDragging,
    reducedMotion,
    setHeaderElement,
    setFooterElement,
    handleDragStart
  }
}
