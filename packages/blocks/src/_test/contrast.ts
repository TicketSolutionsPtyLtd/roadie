import { expect } from 'vitest'

import {
  minimumLc,
  textContrast,
  textRole
} from '@oztix/roadie-browser-testing/contrast'

export {
  fillContrast,
  textContrast
} from '@oztix/roadie-browser-testing/contrast'

const TINTED = '.emphasis-subtle, .emphasis-subtler'

// Body text under 0010's Lc 75 that already shipped. Each leaves once its
// ticket is fixed; anything else fails.
const KNOWN_LOW_CONTRAST: {
  matches: (element: Element) => boolean
  /** Just under the lowest Lc measured when listed, so a worse pair fails. */
  floor: number
  ticket: string
}[] = [
  {
    // Cards' secondary text on a tinted card in a tinted section, where the
    // tints stack. Lc 70.0 at the lowest, in light mode. Other blocks'
    // stacked tints aren't covered: they hold to 75.
    matches: (element) =>
      element.matches('.text-subtle') &&
      !!element.closest('[data-block="cards"]') &&
      !!element.closest(TINTED)?.parentElement?.closest(TINTED),
    floor: 69,
    ticket: 'INNO-1756'
  }
]

const knownLowContrast = (element: Element) =>
  KNOWN_LOW_CONTRAST.find((entry) => entry.matches(element))

/** The least a filled control's fill should differ from the surface it sits on. */
export const MINIMUM_FILL_LC = 15

/**
 * The Lc an element's text needs: decision 0010's floor for its role, where
 * buttons and links of a few words are labels, or the floor of a shortfall
 * that already shipped.
 */
export function textFloor(element: Element): number {
  const role = textRole(element, 'a, button')
  return (
    (role === 'body text' && knownLowContrast(element)?.floor) ||
    minimumLc[role]
  )
}

/** Asserts an element's text meets `textFloor`. */
export function expectReadable(element: Element, message?: string) {
  expect(textContrast(element), message).toBeGreaterThanOrEqual(
    textFloor(element)
  )
}

export const MODES = ['light', 'dark'] as const

export function setMode(mode: (typeof MODES)[number]) {
  document.documentElement.classList.toggle('dark', mode === 'dark')
}
