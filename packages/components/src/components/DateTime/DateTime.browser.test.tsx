import { cleanup, render } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { DateTime } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { hydrationShift } from '../../utils/hydrationTestUtils'
import { useStylesheet } from '../Pane/testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const BNE = 'Australia/Brisbane'
const at = new Date('2026-11-27T09:30:00Z')

describe('DateTime stacked', () => {
  it.each([
    ['a moment', undefined],
    ['a range on one day', new Date('2026-11-27T13:00:00Z')]
  ])('puts the time line under the date line for %s', (_, to) => {
    const { container } = render(
      <DateTime at={at} to={to} timeZone={BNE} timeStyle='medium' stacked />
    )
    const [date, time] = [...container.firstElementChild!.children]
    const dateBox = date!.getBoundingClientRect()
    const timeBox = time!.getBoundingClientRect()
    expect(timeBox.top).toBeGreaterThanOrEqual(dateBox.bottom - 0.5)
    expect(timeBox.left).toBeCloseTo(dateBox.left, 0)
  })

  it('hides the separator that keeps the two lines apart for a screen reader', () => {
    const { container } = render(
      <DateTime at={at} timeZone={BNE} timeStyle='medium' stacked />
    )
    const separator = container.querySelector('.sr-only')!
    expect(separator.getBoundingClientRect().width).toBeLessThanOrEqual(1)
  })

  it('quietens the time line against the date', () => {
    const { container } = render(
      <DateTime at={at} timeZone={BNE} timeStyle='medium' stacked />
    )
    const [date, time] = [...container.firstElementChild!.children]
    expect(getComputedStyle(time!).color).not.toBe(
      getComputedStyle(date!).color
    )
  })
})

describe('DateTime standalone, before hydration', () => {
  const DAY = 86_400_000
  const now = Date.now()
  // Two days that share this year, whatever today is.
  const [from, to] =
    new Date(now).getMonth() === 0
      ? [new Date(now), new Date(now + 2 * DAY)]
      : [new Date(now - 2 * DAY), new Date(now)]
  const lastYear = new Date(now - 400 * DAY)
  const year = (date: Date) => String(date.getFullYear())

  it.each([
    [
      'a date this year',
      <DateTime at={to} timeZone={BNE} context='standalone' />,
      false
    ],
    [
      'a range this year',
      <DateTime at={from} to={to} timeZone={BNE} context='standalone' />,
      false
    ],
    [
      'a date in another year',
      <DateTime at={lastYear} timeZone={BNE} context='standalone' />,
      true
    ]
  ])(
    'paints %s in its final words, where it stays',
    async (_, date, keepsYear) => {
      const ui = (
        <p className='inline-flex gap-4'>
          {date}
          <span>Doors open</span>
        </p>
      )
      const html = renderToString(ui)
      expect(html).toContain(year(keepsYear ? lastYear : to))
      expect(await hydrationShift(html, ui)).toEqual([])
    }
  )
})
