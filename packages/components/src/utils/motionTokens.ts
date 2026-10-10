// The browser's animation API takes numbers and easing strings, not CSS
// variables, so JavaScript motion reads the tokens where it runs. The
// fallbacks are core's values, for a page without its CSS, such as jsdom.
const DURATIONS = { moderate: 200, slow: 300 } as const
const EASINGS = { enter: 'cubic-bezier(0, 0, 0.2, 1)' } as const

const read = (element: Element, name: string) =>
  getComputedStyle(element).getPropertyValue(name).trim()

/** A `--duration-*` token in milliseconds. */
export function durationToken(
  element: Element,
  step: keyof typeof DURATIONS
): number {
  const value = read(element, `--duration-${step}`)
  const ms = parseFloat(value) * (value.endsWith('ms') ? 1 : 1000)
  return ms >= 0 ? ms : DURATIONS[step]
}

/** An `--ease-*` token as an easing string. */
export function easingToken(
  element: Element,
  name: keyof typeof EASINGS
): string {
  return read(element, `--ease-${name}`) || EASINGS[name]
}
