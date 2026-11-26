// Rules both cart drawer skins share, so React and Vue can't drift apart.

import {
  MOBILE_OPEN_TOP_INSET_PX,
  TAP_PX,
  VIEWPORT_MARGIN_PX
} from './constants'
import { decideSnapTarget } from './snap'

export type DrawerState = 'open' | 'closed'

export const DRAWER_SPRING = {
  type: 'spring',
  damping: 30,
  stiffness: 300
} as const

export function openDrawerHeight(): number {
  if (typeof window === 'undefined') return 0
  if (window.innerWidth < 640) {
    // clientHeight is what `position: fixed` is measured against; inset keeps it clear of top chrome.
    const layoutH = document.documentElement.clientHeight || window.innerHeight
    return Math.max(0, layoutH - MOBILE_OPEN_TOP_INSET_PX)
  }
  const vh = window.visualViewport?.height ?? window.innerHeight
  return Math.max(0, vh - VIEWPORT_MARGIN_PX)
}

export type DrawerDragStart = {
  pointer: Pick<PointerEvent, 'pointerId' | 'clientY'>
  wasOpen: boolean
  getHeight: () => number
  setHeight: (px: number) => void
  bounds: () => { closedHeight: number; maxHeight: number }
  /** Where the drawer should come to rest once the pointer lets go. */
  onRelease: (target: DrawerState) => void
}

/** `target` and `now` default to window and the clock; tests inject them. */
export function createDrawerDrag(
  target?: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>,
  now: () => number = () => Date.now()
) {
  let detach: (() => void) | null = null

  // Follows one pointer; false while another pointer already drags.
  const start = ({
    pointer: { pointerId, clientY: startY },
    wasOpen,
    getHeight,
    setHeight,
    bounds,
    onRelease
  }: DrawerDragStart) => {
    if (detach) return false
    const on = target ?? window
    const startHeight = getHeight()
    let lastClientY = startY
    let lastTime = now()
    let velocity = 0 // px/s; positive = moving up

    const onMove = (event: Event) => {
      const ev = event as PointerEvent
      if (ev.pointerId !== pointerId) return
      const { closedHeight, maxHeight } = bounds()
      const delta = startY - ev.clientY // positive = dragged up = opening
      const height = Math.min(
        maxHeight,
        Math.max(closedHeight, startHeight + delta)
      )
      const time = now()
      const dt = time - lastTime
      if (dt > 0) velocity = ((lastClientY - ev.clientY) / dt) * 1000
      lastClientY = ev.clientY
      lastTime = time
      setHeight(height)
    }

    const onUp = (event: Event) => {
      if ((event as PointerEvent).pointerId !== pointerId) return
      detach?.()
      const currentHeight = getHeight()
      if (Math.abs(currentHeight - startHeight) < TAP_PX) {
        onRelease(wasOpen ? 'closed' : 'open')
        return
      }
      const { closedHeight, maxHeight } = bounds()
      // decideSnapTarget works in Y (up = negative); height is up = positive.
      onRelease(
        decideSnapTarget({
          velocity: -velocity,
          offset: -(currentHeight - startHeight),
          currentState: wasOpen ? 'open' : 'closed',
          openY: 0,
          closedY: maxHeight - closedHeight
        })
      )
    }

    detach = () => {
      on.removeEventListener('pointermove', onMove)
      on.removeEventListener('pointerup', onUp)
      on.removeEventListener('pointercancel', onUp)
      detach = null
    }
    on.addEventListener('pointermove', onMove)
    on.addEventListener('pointerup', onUp)
    on.addEventListener('pointercancel', onUp)
    return true
  }

  // dispose stops following the pointer without a release, as on unmount.
  return { start, dispose: () => detach?.() }
}
