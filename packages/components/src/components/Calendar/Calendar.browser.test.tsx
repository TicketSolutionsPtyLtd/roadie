import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands, userEvent } from 'vitest/browser'

import { Calendar } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { setHoverCapable } from '../../css/testUtils'
import { useStylesheet } from '../Pane/testUtils'

const STILL = '*, *::before, *::after { transition: none !important }'
// 1 March 2027 is a Monday.
const TODAY = '2027-03-10'

let removeStylesheets = () => {}
beforeAll(() => {
  const removeRoadie = useStylesheet(roadieCss)
  const removeStill = useStylesheet(STILL)
  removeStylesheets = () => {
    removeRoadie()
    removeStill()
  }
})
afterAll(() => removeStylesheets())
afterEach(async () => {
  setHoverCapable(true)
  cleanup()
  await commands.parkPointer()
})

const day = (date: string) =>
  document.querySelector<HTMLButtonElement>(
    `[data-slot="calendar"] button[data-date="${date}"]:not([data-outside])`
  )!

const focused = () => (document.activeElement as HTMLElement).dataset.date

const caption = () =>
  screen
    .getAllByRole('grid')
    .map(
      (grid) =>
        document.getElementById(grid.getAttribute('aria-labelledby')!)!
          .textContent
    )

async function tabIntoGrid() {
  while (!focused()) await userEvent.tab()
}

describe('Calendar keyboard', () => {
  it('tabs to today, past the month arrows', async () => {
    render(<Calendar today={TODAY} />)
    await userEvent.tab()
    await userEvent.tab()
    await userEvent.tab()
    expect(focused()).toBe(TODAY)
  })

  it.each([
    ['{ArrowRight}', '2027-03-11'],
    ['{ArrowLeft}', '2027-03-09'],
    ['{ArrowDown}', '2027-03-17'],
    ['{ArrowUp}', '2027-03-03'],
    ['{Home}', '2027-03-08'],
    ['{End}', '2027-03-14'],
    ['{PageDown}', '2027-04-10'],
    ['{PageUp}', '2027-02-10'],
    ['{Shift>}{PageDown}{/Shift}', '2028-03-10'],
    ['{Shift>}{PageUp}{/Shift}', '2026-03-10']
  ])('moves focus with %s to %s', async (keys, expected) => {
    render(<Calendar today={TODAY} />)
    await tabIntoGrid()
    await userEvent.keyboard(keys)
    expect(focused()).toBe(expected)
    expect(document.activeElement).toHaveAttribute('data-focused')
    expect(document.activeElement).toHaveAttribute('tabindex', '0')
  })

  it('crosses into the next month a day at a time, skipping nothing', async () => {
    render(<Calendar today='2027-03-30' showOutsideDays />)
    await tabIntoGrid()
    await userEvent.keyboard('{ArrowRight}{ArrowRight}')
    expect(caption()).toEqual(['April 2027'])
    expect(focused()).toBe('2027-04-01')
    expect(document.activeElement).not.toHaveAttribute('data-outside')
    await userEvent.keyboard('{ArrowLeft}')
    expect(caption()).toEqual(['March 2027'])
    expect(focused()).toBe('2027-03-31')
  })

  it('moves between shown months without turning the page', async () => {
    render(<Calendar today='2027-03-28' numberOfMonths={2} showOutsideDays />)
    await tabIntoGrid()
    await userEvent.keyboard('{ArrowDown}')
    expect(caption()).toEqual(['March 2027', 'April 2027'])
    expect(focused()).toBe('2027-04-04')
    expect(document.activeElement).not.toHaveAttribute('data-outside')
    await userEvent.keyboard('{PageDown}')
    expect(caption()).toEqual(['April 2027', 'May 2027'])
    expect(focused()).toBe('2027-05-04')
  })

  it('selects with Enter and Space', async () => {
    render(<Calendar today={TODAY} mode='multiple' />)
    await tabIntoGrid()
    await userEvent.keyboard('{Enter}{ArrowRight} ')
    expect(day(TODAY)).toHaveAttribute('data-selected')
    expect(day('2027-03-11')).toHaveAttribute('data-selected')
  })

  it('focuses a disabled day but does not select it', async () => {
    render(<Calendar today={TODAY} disabled='2027-03-11' />)
    await tabIntoGrid()
    await userEvent.keyboard('{ArrowRight}{Enter}')
    expect(focused()).toBe('2027-03-11')
    expect(day('2027-03-11')).not.toHaveAttribute('data-selected')
  })

  it('previews a range as the keyboard extends it', async () => {
    render(<Calendar today={TODAY} mode='range' />)
    await tabIntoGrid()
    await userEvent.keyboard('{Enter}{ArrowRight}{ArrowRight}')
    for (const date of ['2027-03-10', '2027-03-11', '2027-03-12'])
      expect(day(date)).toHaveAttribute('data-range-preview')
    expect(day('2027-03-12')).toHaveAttribute('data-range-end')
    await userEvent.keyboard('{Enter}')
    expect(day('2027-03-11')).toHaveAttribute('data-range-middle')
    expect(day('2027-03-11')).not.toHaveAttribute('data-range-preview')
  })
})

describe('Calendar focus', () => {
  it('keeps focus on the month arrows as they turn the page', async () => {
    render(<Calendar today={TODAY} />)
    await userEvent.tab()
    expect(document.activeElement).toHaveAccessibleName('Previous month')
    await userEvent.keyboard('{Enter}')
    expect(document.activeElement).toHaveAccessibleName('Previous month')
    await userEvent.tab()
    expect(document.activeElement).toHaveAccessibleName('Next month')
    await userEvent.keyboard('{Enter}{Enter}')
    expect(caption()).toEqual(['April 2027'])
    expect(document.activeElement).toHaveAccessibleName('Next month')
  })

  it('keeps focus on a caption select as it changes the month', async () => {
    render(<Calendar today={TODAY} captionLayout='dropdown' />)
    const month = screen.getByRole('combobox', { name: 'Month' })
    await userEvent.selectOptions(month, 'July')
    expect(caption()).toEqual(['July 2027'])
    expect(screen.getByRole('combobox', { name: 'Month' })).toBe(month)
  })

  it.each([
    ['Home on the first day of the week', '2027-03-08', '{Home}'],
    ['an arrow at the last month', '2027-03-31', '{ArrowRight}']
  ])('lets focus leave after %s', async (_, today, key) => {
    render(
      <>
        <Calendar today={today} endMonth='2027-03-01' />
        <input aria-label='After' />
      </>
    )
    await tabIntoGrid()
    await userEvent.keyboard(key)
    expect(focused()).toBe(today)
    await userEvent.tab()
    expect(document.activeElement).toHaveAccessibleName('After')
  })
})

describe('Calendar pointer', () => {
  it('previews a range under the pointer', async () => {
    render(<Calendar today={TODAY} mode='range' />)
    await userEvent.click(day('2027-03-03'))
    await userEvent.hover(day('2027-03-06'))
    for (const date of ['2027-03-03', '2027-03-04', '2027-03-05', '2027-03-06'])
      expect(day(date)).toHaveAttribute('data-range-preview')
    await userEvent.click(day('2027-03-06'))
    expect(day('2027-03-04')).toHaveAttribute('data-range-middle')
  })

  it('draws a range as one band from end to end', async () => {
    render(
      <Calendar
        today={TODAY}
        mode='range'
        defaultSelected={{ start: '2027-03-03', end: '2027-03-05' }}
      />
    )
    const start = day('2027-03-03')
    const middle = day('2027-03-04')
    const end = day('2027-03-05')
    const fill = (element: Element) => getComputedStyle(element).backgroundColor
    expect(getComputedStyle(middle).borderRadius).toBe('0px')
    expect(getComputedStyle(start).borderRadius).not.toBe('0px')
    expect(fill(start)).not.toBe(fill(middle))
    expect(fill(middle)).not.toBe('rgba(0, 0, 0, 0)')
    const band = (cell: Element) => getComputedStyle(cell, '::before')
    expect(band(start.closest('td')!).backgroundColor).toBe(fill(middle))
    expect(band(end.closest('td')!).backgroundColor).toBe(fill(middle))
    const [a, b, c] = [start, middle, end].map((el) =>
      el.closest('td')!.getBoundingClientRect()
    )
    expect(b!.left).toBe(a!.right)
    expect(c!.left).toBe(b!.right)
  })

  it('keeps an unchosen day clear on a touch screen', async () => {
    render(<Calendar today={TODAY} />)
    setHoverCapable(false)
    await userEvent.hover(day('2027-03-12'))
    expect(getComputedStyle(day('2027-03-12')).backgroundColor).toBe(
      'rgba(0, 0, 0, 0)'
    )
  })

  it('chooses a range with two taps and no preview from touch', async () => {
    render(<Calendar today={TODAY} mode='range' />)
    setHoverCapable(false)
    await userEvent.click(day('2027-03-03'))
    day('2027-03-08').dispatchEvent(
      new PointerEvent('pointerover', { bubbles: true, pointerType: 'touch' })
    )
    day('2027-03-08').dispatchEvent(
      new PointerEvent('pointerenter', { pointerType: 'touch' })
    )
    expect(day('2027-03-05')).not.toHaveAttribute('data-range-preview')
    await userEvent.click(day('2027-03-08'))
    expect(day('2027-03-05')).toHaveAttribute('data-range-middle')
  })
})

describe('Calendar layout', () => {
  it('draws 40px days in a 280px month', () => {
    render(<Calendar today={TODAY} />)
    const rect = day(TODAY).getBoundingClientRect()
    expect([rect.width, rect.height]).toEqual([40, 40])
    const month = document.querySelector('[data-slot="calendar-month"]')!
    expect(month.getBoundingClientRect().width).toBe(280)
  })

  it('puts months side by side where they fit', () => {
    render(
      <div className='w-200'>
        <Calendar today={TODAY} numberOfMonths={2} />
      </div>
    )
    const [first, second] = Array.from(
      document.querySelectorAll('[data-slot="calendar-month"]'),
      (month) => month.getBoundingClientRect()
    )
    expect(second!.top).toBe(first!.top)
    expect(second!.left).toBeGreaterThan(first!.right)
  })

  it('stacks months where they do not', () => {
    render(
      <div className='w-97.5'>
        <Calendar today={TODAY} numberOfMonths={2} />
      </div>
    )
    const [first, second] = Array.from(
      document.querySelectorAll('[data-slot="calendar-month"]'),
      (month) => month.getBoundingClientRect()
    )
    expect(second!.top).toBeGreaterThan(first!.bottom)
    expect(second!.left).toBe(first!.left)
    expect(
      document.querySelector('[data-slot="calendar"]')!.getBoundingClientRect()
        .width
    ).toBeLessThanOrEqual(390)
  })
})
