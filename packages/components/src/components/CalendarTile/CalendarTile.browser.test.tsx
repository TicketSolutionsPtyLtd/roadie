import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { CalendarTile } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

// The writing rule allows all caps only for acronyms, so the month reads as
// the locale abbreviates it, with the tracking it inherits rather than the
// wide tracking caps needed.
const expectSentenceCase = (top: HTMLElement) => {
  const style = getComputedStyle(top)
  expect(style.textTransform).toBe('none')
  expect(style.letterSpacing).toBe(
    getComputedStyle(top.parentElement!).letterSpacing
  )
  expect(top.innerText).toBe('Oct')
}

describe('CalendarTile month', () => {
  it('renders the month as given, not in capitals', () => {
    const { container } = render(<CalendarTile month='Oct' day={15} />)
    expectSentenceCase(
      container.querySelector<HTMLElement>('[data-slot="calendar-tile-top"]')!
    )
  })

  it('matches in the CSS twin', () => {
    const { container } = render(
      <div className='calendar-tile emphasis-subtle' aria-hidden>
        <span className='calendar-tile-top'>Oct</span>
        <span className='calendar-tile-day'>15</span>
      </div>
    )
    expectSentenceCase(
      container.querySelector<HTMLElement>('.calendar-tile-top')!
    )
  })
})

// Mixed case reads smaller than caps, so the band sits on the scale's first
// step, text-xs, at every size rather than below it.
describe('CalendarTile band size', () => {
  const sizes = ['sm', 'md', 'lg'] as const
  const px = (value: string) => parseFloat(value)
  const textXs = () =>
    px(getComputedStyle(document.documentElement).fontSize) * 0.75

  for (const size of sizes) {
    it(`sets the band in text-xs at ${size}, the same in React and CSS`, () => {
      const { container } = render(
        <>
          <CalendarTile month='Oct' day={15} size={size} />
          <div
            className={`calendar-tile calendar-tile-${size} emphasis-subtle`}
            aria-hidden
          >
            <span className='calendar-tile-top'>Oct</span>
            <span className='calendar-tile-day'>15</span>
          </div>
        </>
      )
      const react = container.querySelector<HTMLElement>(
        '[data-slot="calendar-tile-top"]'
      )!
      const twin = container.querySelector<HTMLElement>('.calendar-tile-top')!

      expect(px(getComputedStyle(react).fontSize)).toBeCloseTo(textXs(), 1)
      expect(px(getComputedStyle(twin).fontSize)).toBeCloseTo(textXs(), 1)
      // text-xs brings no leading of its own, so the band must keep the
      // tile's tight leading rather than open up to the font's normal height.
      expect(getComputedStyle(react).lineHeight).toBe(
        getComputedStyle(react).fontSize
      )
      expect(getComputedStyle(twin).lineHeight).toBe(
        getComputedStyle(twin).fontSize
      )
    })
  }
})
