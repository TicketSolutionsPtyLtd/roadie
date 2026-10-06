import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands, userEvent } from 'vitest/browser'

import { Calendar } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'
import { expectOneContinuousMotion, recordFrames } from './testUtils'

const TODAY = '2027-03-10'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
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
    expectOneContinuousMotion(frames, next, 320)
  })

  it('moves back as one motion, the title changing as it lands', async () => {
    await renderLaidOut()
    const frames = await recordFrames(vertical, () =>
      userEvent.click(screen.getByRole('button', { name: 'Previous month' }))
    )
    expect(frames.at(-1)!.title).toBe('February 2027')
    expectOneContinuousMotion(frames, next === -1 ? 1 : -1, 320)
  })
})
