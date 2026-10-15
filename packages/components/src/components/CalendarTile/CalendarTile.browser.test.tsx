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

// Mixed case reads smaller than caps, so the band's type scales with the
// tile: text-xs at md, text-sm at lg, and 10px at sm, the one size below the
// type scale.
describe('CalendarTile band size', () => {
  const px = (value: string) => parseFloat(value)
  const rem = (n: number) =>
    px(getComputedStyle(document.documentElement).fontSize) * n
  const sizes = [
    { size: 'sm', fontSize: () => 10, padding: () => rem(0.125) },
    { size: 'md', fontSize: () => rem(0.75), padding: () => rem(0.125) },
    { size: 'lg', fontSize: () => rem(0.875), padding: () => rem(0.1875) }
  ] as const

  for (const { size, fontSize, padding } of sizes) {
    it(`sizes the band at ${size}, the same in React and CSS`, () => {
      const { container } = render(
        <>
          <CalendarTile month='Oct' day={15} size={size} />
          <div
            data-twin
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
      const twin = container.querySelector<HTMLElement>(
        '[data-twin] > .calendar-tile-top'
      )!

      for (const band of [react, twin]) {
        const style = getComputedStyle(band)
        expect(px(style.fontSize)).toBeCloseTo(fontSize(), 1)
        expect(px(style.paddingTop)).toBeCloseTo(padding(), 1)
        expect(px(style.paddingBottom)).toBeCloseTo(padding(), 1)
        expect(style.lineHeight).toBe(style.fontSize)
      }
      expect(react.getBoundingClientRect().height).toBeCloseTo(
        twin.getBoundingClientRect().height,
        1
      )
    })
  }

  it('sizes the band of a <time> tile too', () => {
    const { container } = render(
      <CalendarTile month='Oct' day={15} size='lg' dateTime='2026-10-15' />
    )
    const band = container.querySelector<HTMLElement>(
      'time > [data-slot="calendar-tile-top"]'
    )!
    expect(px(getComputedStyle(band).fontSize)).toBeCloseTo(rem(0.875), 1)
  })

  // The band's border adds to its height, so it stays at every emphasis. On
  // a strong tile it outlines the light band, as emphasis-normal does.
  it('outlines the band on a strong tile only', () => {
    const { container } = render(
      <>
        <CalendarTile month='Oct' day={15} emphasis='strong' />
        <div data-twin className='calendar-tile emphasis-strong' aria-hidden>
          <span className='calendar-tile-top'>Oct</span>
          <span className='calendar-tile-day'>15</span>
        </div>
        <CalendarTile month='Oct' day={15} emphasis='subtle' />
      </>
    )
    const [strong, twin, subtle] = [
      ...container.querySelectorAll<HTMLElement>('.calendar-tile-top')
    ].map((band) => getComputedStyle(band))
    const transparent = 'rgba(0, 0, 0, 0)'
    expect(strong!.borderTopColor).not.toBe(transparent)
    expect(twin!.borderTopColor).toBe(strong!.borderTopColor)
    expect(subtle!.borderTopColor).toBe(transparent)
  })

  it('still lets a size class override the tile size', () => {
    const { container } = render(
      <CalendarTile month='Oct' day={15} size='lg' className='size-16' />
    )
    const root = container.querySelector<HTMLElement>(
      '[data-slot="calendar-tile"]'
    )!
    expect(root.getBoundingClientRect().width).toBeCloseTo(rem(4), 0)
  })
})
