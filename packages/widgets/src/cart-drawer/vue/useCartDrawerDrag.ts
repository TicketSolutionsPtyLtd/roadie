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

import { MEASURE_PROGRESS_MAX } from '../../cart'
import {
  DRAWER_SPRING,
  createDrawerDrag,
  openDrawerHeight
} from '../../cart/drawer'

export type UseCartDrawerDragReturn = {
  state: Ref<'open' | 'closed'>
  setState: (next: 'open' | 'closed') => void
  toggle: () => void
  snapTo: (next: 'open' | 'closed') => void
  dragHeight: Ref<number>
  progress: ComputedRef<number>
  headerHeight: Ref<number>
  footerHeight: Ref<number>
  closedHeight: ComputedRef<number>
  maxHeight: Ref<number>
  isDragging: Ref<boolean>
  reducedMotion: Ref<boolean>
  setHeaderElement: (el: HTMLElement | null) => void
  setFooterElement: (el: HTMLElement | null) => void
  handleDragStart: (e: PointerEvent) => void
}

type Options = {
  initialState?: 'open' | 'closed'
}

export function useCartDrawerDrag(opts: Options = {}): UseCartDrawerDragReturn {
  const initialState = opts.initialState ?? 'closed'
  const state = ref<'open' | 'closed'>(initialState)

  const headerHeight = ref(53)
  const footerHeight = ref(64)
  const closedHeight = computed(() => headerHeight.value + footerHeight.value)
  const maxHeight = ref(openDrawerHeight())
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

  // Animate the ref each frame, not a CSS transition, so `progress` ramps with
  // the spring rather than snapping 0↔1 on toggle.
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
      ...DRAWER_SPRING,
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

  const drag = createDrawerDrag()

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

    // (Re)observe ONLY a genuinely new element: re-observing on every render
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
    maxHeight.value = openDrawerHeight()
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
    drag.dispose()
    if (typeof window === 'undefined') return
    window.removeEventListener('resize', updateViewport)
    window.visualViewport?.removeEventListener('resize', updateViewport)
    motionQuery?.removeEventListener('change', onMotionChange)
  })

  // Imperative state set (no spring). Mirrors React's layout-effect snap.
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
    const started = drag.start({
      pointer: e,
      wasOpen: state.value === 'open',
      getHeight: () => dragHeight.value,
      setHeight: (px) => (dragHeight.value = px),
      bounds: () => ({
        closedHeight: closedHeight.value,
        maxHeight: maxHeight.value
      }),
      onRelease: (target) => {
        isDragging.value = false
        snapTo(target)
      }
    })
    if (!started) return
    isDragging.value = true
    // Hand the height over to the pointer: cancel any in-flight snap spring.
    stopHeightAnim()
  }

  return {
    state,
    setState,
    toggle,
    snapTo,
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
