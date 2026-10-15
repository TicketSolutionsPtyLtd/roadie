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
