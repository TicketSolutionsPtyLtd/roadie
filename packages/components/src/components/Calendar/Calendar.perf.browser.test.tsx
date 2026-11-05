import { afterAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'

import {
  type FrameReport,
  expectFrameBudget,
  measureFrames,
  mount,
  settle,
  setupFrameTests
} from '@oztix/roadie-frames'

import { Calendar } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { BACKDROP_BLUR } from '../../utils/frameTestUtils'
import { DateRangePicker } from '../DateRangePicker'
import { countRenders } from '../RecordTable/renderCounter'

const TODAY = '2027-03-10'

setupFrameTests({ css: roadieCss })
afterAll(() => page.viewport(1440, 900))

// A finger drag, one move a frame, then the slide after it lifts, and how
// many of those frames the calendar followed the finger.
async function dragFrames(
  target: Element,
  dx: number,
  dy: number
): Promise<{ frames: FrameReport; dragged: number }> {
  const box = target.getBoundingClientRect()
  const x = box.left + box.width / 2
  const y = box.top + box.height / 2
  const touchAt = (along: number) =>
    new Touch({
      identifier: 1,
      target,
      clientX: x + dx * along,
      clientY: y + dy * along
    })
  const fire = (type: string, along: number) =>
    target.dispatchEvent(
      new TouchEvent(type, {
        bubbles: true,
        cancelable: true,
        touches: type === 'touchend' ? [] : [touchAt(along)],
        changedTouches: [touchAt(along)]
      })
    )
  fire('touchstart', 0)
  const moves = 30
  let dragged = 0
  const frames = await measureFrames(
    (index) => {
      if (index < moves) fire('touchmove', (index + 1) / moves)
      else if (index === moves) fire('touchend', 1)
      if (target.closest('[data-dragging]')) dragged++
    },
    { frames: 60 }
  )
  return { frames, dragged }
}

const day = (root: Element, date: string) =>
  root.querySelector(
    `button[data-date="${date}"]:not([data-outside]):not([data-peek] *)`
  )!

const firstMonth = (root: Element) =>
  root
    .querySelector(
      '[data-slot="calendar-month"]:not([data-peek]):not([data-peek] *)'
    )
    ?.getAttribute('data-month')

describe('Calendar turns at 60fps on a slowed CPU', () => {
  it.each([
    ['one month', 390, 1, -200, 0],
    ['two months side by side', 1440, 2, -200, 0],
    ['two months stacked, turning up', 390, 2, 0, -200]
  ] as const)(
    'drags and slides %s',
    async (name, width, numberOfMonths, dx, dy) => {
      await page.viewport(width, 900)
      const root = await mount(
        <div className={width > 600 ? 'w-200' : 'w-97.5'}>
          <Calendar today={TODAY} numberOfMonths={numberOfMonths} />
        </div>
      )
      await settle(3)
      const { frames, dragged } = await dragFrames(
        day(root, '2027-03-17'),
        dx,
        dy
      )
      await expectFrameBudget(
        `Calendar, ${name}, drag`,
        frames,
        dy ? { knownMiss: 'INNO-1529' } : {}
      )
      expect(dragged).toBeGreaterThan(20)
      const next = root.querySelector<HTMLElement>(
        'button[aria-label="Next month"]'
      )!
      const before = firstMonth(root)!
      await expectFrameBudget(
        `Calendar, ${name}, next month`,
        await measureFrames((i) => i === 0 && next.click(), { frames: 60 })
      )
      await expect.poll(() => (firstMonth(root) ?? '') > before).toBe(true)
    }
  )

  it.each([
    ['one month', 390, 1],
    ['two months', 1440, 2]
  ] as const)(
    'switches %s between month and week',
    async (name, width, numberOfMonths) => {
      await page.viewport(width, 900)
      // A page below the calendar, so a switch that moves it shows its cost.
      const root = await mount(
        <div className='grid gap-4'>
          <div className={width > 600 ? 'w-200' : 'w-97.5'}>
            <Calendar
              today={TODAY}
              numberOfMonths={numberOfMonths}
              views={['week', 'month']}
            />
          </div>
          {Array.from({ length: 300 }, (_, i) => (
            <p key={i} className='text-sm'>
              Doors open at seven at the Kazoo Hollow Room, with support from
              two local acts before the headline set.
            </p>
          ))}
        </div>
      )
      await settle(3)
      for (const view of ['Week', 'Month']) {
        const item = root.querySelector<HTMLElement>(
          `button[aria-label="${view}"]`
        )!
        await expectFrameBudget(
          `Calendar, ${name}, to ${view.toLowerCase()}`,
          await measureFrames((i) => i === 0 && item.click(), { frames: 60 })
        )
        expect(item).toHaveAttribute('aria-pressed', 'true')
      }
    }
  )

  it('scrolls months in the DateRangePicker phone drawer', async () => {
    await page.viewport(390, 844)
    const root = await mount(
      <DateRangePicker aria-label='Sales period' today='2026-10-07' />
    )
    root.querySelector<HTMLElement>('button')!.click()
    await settle(40)
    const scroller = Array.from(
      document.querySelectorAll<HTMLElement>('[role="dialog"] *')
    ).find(
      (element) =>
        /auto|scroll/.test(getComputedStyle(element).overflowY) &&
        element.scrollHeight > element.clientHeight
    )!
    expect(scroller).toBeTruthy()
    let frames: FrameReport | undefined
    const renders = await countRenders(async () => {
      frames = await measureFrames(() => {
        scroller.scrollTop += 24
      })
    })
    // Scrolling past months is the list's own business, not the picker's.
    expect(renders.ExtendedDateRangePicker ?? 0).toBe(0)
    await expectFrameBudget('DateRangePicker, phone drawer, scroll', frames!, {
      exception: BACKDROP_BLUR
    })
  })
})
