import { commands } from 'vitest/browser'

export type TapSpot = 'text' | 'centre' | 'far right' | 'top padding'

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * The element's box once it stops moving, as a popup scales in or a drawer
 * slides up: a slow runner can still be animating when a fixed wait ends.
 */
export async function settledBox(element: Element): Promise<DOMRect> {
  let last = element.getBoundingClientRect()
  for (let tries = 0; tries < 80; tries++) {
    await wait(50)
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
  await commands.tap(x, y)
  await wait(200)
}
