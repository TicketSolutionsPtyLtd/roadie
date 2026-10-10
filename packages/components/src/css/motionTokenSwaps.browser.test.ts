import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import roadieCss from '../../vitest.browser.css?inline'
import { useStylesheet } from '../components/Pane/testUtils'

// Components moved from Tailwind's numeric timing to Roadie's tokens; each
// swap must compute to exactly what it replaced, or the move changed motion.
const SWAPS = [
  ['duration-150', 'duration-normal'],
  ['duration-200', 'duration-moderate'],
  ['duration-300', 'duration-slow'],
  ['ease-out', 'ease-enter']
] as const

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())

function timing(className: string) {
  const element = document.createElement('div')
  element.className = `transition-opacity ${className}`
  document.body.append(element)
  const { transitionDuration, transitionTimingFunction } =
    getComputedStyle(element)
  element.remove()
  return { transitionDuration, transitionTimingFunction }
}

describe('motion token swaps', () => {
  it.each(SWAPS)('%s computes the same as %s', (before, after) => {
    expect(timing(after)).toEqual(timing(before))
  })
})
