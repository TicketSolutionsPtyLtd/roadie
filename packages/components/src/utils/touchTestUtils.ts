import { expect } from 'vitest'
import { commands } from 'vitest/browser'

export type TapSpot = 'text' | 'centre' | 'far right' | 'top padding'

/**
 * The element's box once it stops moving, as a popup scales in or a drawer
 * slides up: a slow runner can still be animating when a fixed wait ends.
 */
export async function settledBox(element: Element): Promise<DOMRect> {
  let last = element.getBoundingClientRect()
  for (let tries = 0; tries < 80; tries++) {
    // Polls the box between frames: Linux WebKit runs none while idle.
    // eslint-disable-next-line roadie/no-fixed-sleep
    await new Promise((resolve) => setTimeout(resolve, 50))
    const next = element.getBoundingClientRect()
    if (
      element.isConnected &&
      next.width > 0 &&
      next.top === last.top &&
      next.left === last.left &&
      next.width === last.width &&
      next.height === last.height
    )
      return next
    last = next
  }
  return last
}

// A tap's events end in a click, unless a touch handler cancelled it or the
// browser took the touch for a scroll.
function tapEnded() {
  let clicked = false
  let cancelled = false
  let touchEnd: Event | undefined
  const listeners = {
    click: () => (clicked = true),
    pointercancel: () => (cancelled = true),
    touchend: (event: Event) => (touchEnd = event)
  }
  for (const [type, listener] of Object.entries(listeners))
    window.addEventListener(type, listener, true)
  return async () => {
    try {
      await expect
        .poll(() => clicked || cancelled || !!touchEnd?.defaultPrevented)
        .toBe(true)
    } finally {
      for (const [type, listener] of Object.entries(listeners))
        window.removeEventListener(type, listener, true)
    }
  }
}

/** A real touch tap at a spot in the element, once it has settled. */
export async function tapOn(element: Element, spot: TapSpot = 'text') {
  const { left, top, right, width, height } = await settledBox(element)
  const [x, y] =
    spot === 'far right'
      ? [right - 4, top + height / 2]
      : spot === 'top padding'
        ? [left + width / 2, top + 2]
        : spot === 'centre'
          ? [left + width / 2, top + height / 2]
          : [left + Math.min(20, width / 2), top + height / 2]
  const ended = tapEnded()
  await commands.tap(x, y)
  await ended()
}
