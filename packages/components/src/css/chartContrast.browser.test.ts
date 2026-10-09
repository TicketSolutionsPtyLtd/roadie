import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import roadieCss from '../../vitest.browser.css?inline'
import { useStylesheet } from '../components/Pane/testUtils'
import { apcaLc, flatten, minimumLc } from './contrastTestUtils'

// Core's chart tokens live in its sheets, but only this package runs browser
// tests, so the resolved dark values are checked here.

const DARK_MARKS = [
  ...Array.from({ length: 8 }, (_, i) => `--chart-${i + 1}`),
  '--chart-context',
  '--chart-other'
]

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())

let host: HTMLElement | undefined
afterEach(() => {
  host?.remove()
  document.documentElement.classList.remove('dark')
})

// The page surface the dataviz validator measures against.
function markOnDarkPage(token: string) {
  document.documentElement.classList.add('dark')
  host = document.createElement('div')
  host.style.background = 'var(--color-neutral-2)'
  host.style.color = `var(${token})`
  document.body.append(host)
  const { color, backgroundColor } = getComputedStyle(host)
  return Math.abs(apcaLc(flatten(color), flatten(backgroundColor)))
}

describe('dark chart marks', () => {
  it.each(DARK_MARKS)('%s reads at Lc 45 on the dark page', (token) => {
    expect(markOnDarkPage(token)).toBeGreaterThanOrEqual(
      minimumLc['non-text UI']
    )
  })
})
