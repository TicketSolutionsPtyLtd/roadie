// Rules both cart drawer skins share, so React and Vue can't drift apart.

import { MOBILE_OPEN_TOP_INSET_PX, VIEWPORT_MARGIN_PX } from './constants'

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
