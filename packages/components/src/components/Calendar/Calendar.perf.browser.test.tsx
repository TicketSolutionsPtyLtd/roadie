import type { ReactNode } from 'react'

import { type Root, createRoot } from 'react-dom/client'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands, page } from 'vitest/browser'

import { Calendar } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { DateRangePicker } from '../DateRangePicker'
import { loadBrandFont, useStylesheet } from '../Pane/testUtils'
import { countRenders } from '../RecordTable/renderCounter'

declare module 'vitest/browser' {
  interface BrowserCommands {
    throttleCpu: (rate: number) => Promise<void>
  }
}

const TODAY = '2027-03-10'
// A 60Hz frame, with room for the timer's own jitter.
const FRAME_MS = 1000 / 60
const P95_BUDGET_MS = 17.5

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
  await commands.throttleCpu(4)
})
afterAll(async () => {
  await commands.throttleCpu(1)
  await page.viewport(1440, 900)
  removeStylesheet()
})
let activeRoot: Root | undefined
let activeContainer: HTMLElement | undefined
afterEach(() => {
  activeRoot?.unmount()
  activeContainer?.remove()
  activeRoot = undefined
  activeContainer = undefined
})

const frame = () => new Promise<number>(requestAnimationFrame)

// Production React has no `act`; settling frames keep mount cost out.
async function mount(node: ReactNode) {
  activeContainer = document.createElement('div')
  document.body.append(activeContainer)
  activeRoot = createRoot(activeContainer)
  activeRoot.render(node)
  for (let i = 0; i < 5; i++) await frame()
  return activeContainer
}

type Frames = { p50: number; p95: number; dropped: number }

function summarise(deltas: number[]): Frames {
  const sorted = [...deltas].sort((a, b) => a - b)
  const at = (q: number) =>
    sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]!
  return {
    p50: Math.round(at(0.5) * 10) / 10,
    p95: Math.round(at(0.95) * 10) / 10,
    dropped: deltas.reduce(
      (sum, delta) => sum + Math.max(0, Math.round(delta / FRAME_MS) - 1),
      0
    )
  }
}

/** Frame times while `step` runs once a frame, `count` times. */
async function sample(count: number, step: (index: number) => void = () => {}) {
  const deltas: number[] = []
  let last = await frame()
  for (let index = 0; index < count; index++) {
    step(index)
    const now = await frame()
    deltas.push(now - last)
    last = now
  }
  return deltas
}

// A finger drag, one move a frame, then the slide after it lifts.
async function dragFrames(target: Element, dx: number, dy: number) {
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
  const drag = await sample(moves, (index) =>
    fire('touchmove', (index + 1) / moves)
  )
  fire('touchend', 1)
  const slide = await sample(30)
  return [...drag, ...slide]
}

const day = (root: Element, date: string) =>
  root.querySelector(
    `button[data-date="${date}"]:not([data-outside]):not([data-peek] *)`
  )!

const results: Record<string, Frames> = {}
void results

describe('Calendar turns at 60fps on a 4x slower CPU', () => {
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
      for (let i = 0; i < 3; i++) await frame()
      const frames = summarise(
        await dragFrames(day(root, '2027-03-17'), dx, dy)
      )
      results[`${name}, drag`] = frames
      console.log(`FRAMES ${name}, drag ${JSON.stringify(frames)}`)
      expect(frames.p95).toBeLessThan(P95_BUDGET_MS)
      expect(frames.dropped).toBeLessThanOrEqual(1)
      const next = root.querySelector<HTMLElement>(
        'button[aria-label="Next month"]'
      )!
      const arrow = summarise(await sample(30, (i) => i === 0 && next.click()))
      results[`${name}, arrow`] = arrow
      console.log(`FRAMES ${name}, arrow ${JSON.stringify(arrow)}`)
      expect(arrow.p95).toBeLessThan(P95_BUDGET_MS)
      expect(arrow.dropped).toBeLessThanOrEqual(1)
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
              Doors open at seven at the Corner Hotel, with support from two
              local acts before the headline set.
            </p>
          ))}
        </div>
      )
      for (let i = 0; i < 3; i++) await frame()
      const switches: Frames[] = []
      for (const view of ['Week', 'Month']) {
        const item = root.querySelector<HTMLElement>(
          `button[aria-label="${view}"]`
        )!
        const frames = summarise(
          await sample(30, (i) => i === 0 && item.click())
        )
        results[`${name}, to ${view}`] = frames
        console.log(`FRAMES ${name}, to ${view} ${JSON.stringify(frames)}`)
        switches.push(frames)
      }
      // The click's own frame included: a switch drops none. The p95 budget
      // only allows for the frame clock's jitter about 16.7ms.
      for (const frames of switches) {
        expect(frames.p95).toBeLessThan(P95_BUDGET_MS)
        expect(frames.dropped).toBe(0)
      }
    }
  )

  it('scrolls months in the DateRangePicker phone drawer', async () => {
    await page.viewport(390, 844)
    const root = await mount(
      <DateRangePicker aria-label='Sales period' today='2026-10-07' />
    )
    root.querySelector<HTMLElement>('button')!.click()
    for (let i = 0; i < 40; i++) await frame()
    const scroller = Array.from(
      document.querySelectorAll<HTMLElement>('[role="dialog"] *')
    ).find(
      (element) =>
        /auto|scroll/.test(getComputedStyle(element).overflowY) &&
        element.scrollHeight > element.clientHeight
    )!
    expect(scroller).toBeTruthy()
    let deltas: number[] = []
    const renders = await countRenders(async () => {
      deltas = await sample(60, () => {
        scroller.scrollTop += 24
      })
    })
    // Scrolling past months is the list's own business, not the picker's.
    expect(renders.ExtendedDateRangePicker ?? 0).toBe(0)
    const frames = summarise(deltas)
    results['DateRangePicker drawer, scroll'] = frames
    console.log(
      `FRAMES DateRangePicker drawer, scroll ${JSON.stringify(frames)}`
    )
    expect(frames.p95).toBeLessThan(P95_BUDGET_MS)
    expect(frames.dropped).toBeLessThanOrEqual(1)
  })
})
