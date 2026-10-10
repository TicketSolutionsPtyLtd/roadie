import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands, userEvent } from 'vitest/browser'

import { Calendar } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { nudgeFrames } from '../../css/testUtils'
import { durationToken } from '../../utils/motionTokens'
import { useStylesheet } from '../Pane/testUtils'
import {
  expectOneContinuousMotion,
  expectOneReshape,
  recordFrames,
  recordShapes
} from './testUtils'

const TODAY = '2027-03-10'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  // One turn first, so the engine's first-run costs (compiling, raising
  // layers) don't land in the frames a test reads as the calendar's own.
  render(<Calendar today={TODAY} direction='vertical' />)
  await userEvent.click(screen.getByRole('button', { name: 'Next month' }))
  // expect.poll only runs inside a test; the hook's timeout bounds this.
  const landed = () =>
    document.querySelector(
      '[data-slot="calendar"]:not([data-swiping]) [data-month="2027-04-01"]'
    )
  while (!landed()) await nudgeFrames()
  cleanup()
})
afterAll(() => removeStylesheet())
afterEach(async () => {
  cleanup()
  await commands.parkPointer()
})

describe.each([
  { label: 'one page up and down', months: 1, vertical: true, width: 390 },
  { label: 'stacked months', months: 2, vertical: true, width: 390 },
  { label: 'one page sideways', months: 1, vertical: false, width: 390 },
  { label: 'months side by side', months: 2, vertical: false, width: 800 },
  {
    label: 'months right to left',
    months: 2,
    vertical: false,
    width: 800,
    dir: 'rtl'
  }
] as const)('Calendar frames, $label', (layout) => {
  const { months, vertical, width } = layout
  const rtl = 'dir' in layout
  // Which way the days move for next: up, or toward the start of the row.
  const next = vertical || !rtl ? -1 : 1

  function renderLaidOut() {
    render(
      <div dir={rtl ? 'rtl' : undefined} style={{ width }}>
        <Calendar
          today={TODAY}
          numberOfMonths={months}
          direction={vertical && months === 1 ? 'vertical' : 'horizontal'}
        />
      </div>
    )
    return expect
      .poll(() =>
        document
          .querySelector('[data-slot="calendar"]')!
          .getAttribute('data-paging')
      )
      .toBe(vertical ? 'vertical' : 'horizontal')
  }

  it('moves next as one motion, the title changing as it lands', async () => {
    await renderLaidOut()
    const frames = await recordFrames(vertical, () =>
      userEvent.click(screen.getByRole('button', { name: 'Next month' }))
    )
    expect(frames[0]!.title).toBe('March 2027')
    expect(frames.at(-1)!.title).toBe('April 2027')
    expectOneContinuousMotion(
      frames,
      next,
      durationToken(document.body, 'slow')
    )
  })

  it('moves back as one motion, the title changing as it lands', async () => {
    await renderLaidOut()
    const frames = await recordFrames(vertical, () =>
      userEvent.click(screen.getByRole('button', { name: 'Previous month' }))
    )
    expect(frames.at(-1)!.title).toBe('February 2027')
    expectOneContinuousMotion(
      frames,
      next === -1 ? 1 : -1,
      durationToken(document.body, 'slow')
    )
  })
})

describe('Calendar frames, switching views', () => {
  it.each([
    { width: 390, months: 1 },
    { width: 800, months: 2 }
  ])(
    'reshapes between month and week at $width px in one motion',
    async ({ width, months }) => {
      render(
        <div style={{ width }}>
          <Calendar
            today={TODAY}
            numberOfMonths={months}
            views={['week', 'month']}
          />
        </div>
      )
      const toWeek = await recordShapes(() =>
        userEvent.click(screen.getByRole('button', { name: 'Week' }))
      )
      expect(toWeek.at(-1)!.days.size).toBe(7)
      expect(toWeek.some((frame) => frame.leaving.length > 0)).toBe(true)
      expectOneReshape(toWeek, durationToken(document.body, 'moderate'))
      const toMonth = await recordShapes(() =>
        userEvent.click(screen.getByRole('button', { name: 'Month' }))
      )
      expect(toMonth.at(-1)!.days.size).toBeGreaterThan(27)
      expectOneReshape(toMonth, durationToken(document.body, 'moderate'))
    }
  )

  it('anchors on the selected week inside the month it opens', async () => {
    render(
      <div style={{ width: 390 }}>
        <Calendar
          today={TODAY}
          defaultView='week'
          views={['week', 'month']}
          defaultMonth='2026-11-01'
          defaultSelected='2026-10-28'
        />
      </div>
    )
    const frames = await recordShapes(() =>
      userEvent.click(screen.getByRole('button', { name: 'Month' }))
    )
    expect(screen.getByRole('grid')).toHaveAccessibleName('October 2026')
    expect(frames.at(-1)!.days.has('2026-10-28')).toBe(true)
    expectOneReshape(frames, durationToken(document.body, 'moderate'))
  })
})
