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
        .poll(() => clicked || cancelled || !!touchEnd?.defaultPrevented, {
          message:
            'The tap never ended in a click, pointercancel, or cancelled touchend'
        })
        .toBe(true)
    } finally {
      for (const [type, listener] of Object.entries(listeners))
        window.removeEventListener(type, listener, true)
    }
  }
}

function pointAt(
  { left, top, right, width, height }: DOMRect,
  spot: TapSpot
): [x: number, y: number] {
  if (spot === 'far right') return [right - 4, top + height / 2]
  if (spot === 'top padding') return [left + width / 2, top + 2]
  if (spot === 'centre') return [left + width / 2, top + height / 2]
  return [left + Math.min(20, width / 2), top + height / 2]
}

const lands = (element: Element, [x, y]: [number, number]) =>
  element.contains(document.elementFromPoint(x, y))

/** A real touch tap at a spot in the element, once it has settled. */
export async function tapOn(element: Element, spot: TapSpot = 'text') {
  // A drawer can sit still off screen for a frame before it slides in, which
  // looks settled, so wait for the spot to be on the element first.
  await expect
    .poll(
      () => lands(element, pointAt(element.getBoundingClientRect(), spot)),
      {
        timeout: 5000,
        message: `The ${spot} spot is off screen or covered, so a tap misses the element`
      }
    )
    .toBe(true)
  const [x, y] = pointAt(await settledBox(element), spot)
  const ended = tapEnded()
  await commands.tap(x, y)
  await ended()
}
