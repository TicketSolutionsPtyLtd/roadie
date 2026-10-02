import { useState } from 'react'

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest'

import { Calendar, type CalendarDateRange } from '.'

// 1 March 2027 is a Monday, so March fills five Monday-first weeks exactly.
const TODAY = '2027-03-10'

const day = (date: string) =>
  screen
    .getAllByRole('button')
    .find(
      (button) =>
        button.dataset.date === date && !button.hasAttribute('data-outside')
    )!

const cellOf = (date: string) => day(date).closest('td')!

const live = () => screen.getByRole('status')

describe('Calendar', () => {
  it('renders a whole month with no children', () => {
    render(<Calendar today={TODAY} />)
    const grid = screen.getByRole('grid', { name: 'March 2027' })
    const headers = within(grid).getAllByRole('columnheader')
    expect(headers.map((th) => th.getAttribute('aria-label'))).toEqual([
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday'
    ])
    expect(within(grid).getAllByRole('row')).toHaveLength(6)
    expect(
      screen.getByRole('button', { name: 'Sunday, 14 March 2027' })
    ).toBeInTheDocument()
  })

  it('starts the week on the day given', () => {
    render(<Calendar today={TODAY} weekStart={7} />)
    expect(screen.getAllByRole('columnheader')[0]).toHaveAttribute(
      'aria-label',
      'Sunday'
    )
  })

  it('marks today and gives it the tab stop', () => {
    render(<Calendar today={TODAY} />)
    expect(day(TODAY)).toHaveAttribute('data-today')
    expect(day(TODAY)).toHaveAttribute('aria-current', 'date')
    const stops = screen
      .getAllByRole('button')
      .filter((button) => button.dataset.date && button.tabIndex === 0)
    expect(stops).toEqual([day(TODAY)])
  })

  it('works out today in the time zone given', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    // 1:30am on 14 March in Sydney, still 10:30pm on 13 March in Perth.
    vi.setSystemTime(new Date('2027-03-13T14:30:00Z'))
    const { unmount } = render(<Calendar timeZone='Australia/Sydney' />)
    expect(day('2027-03-14')).toHaveAttribute('data-today')
    unmount()
    render(<Calendar timeZone='Australia/Perth' />)
    expect(day('2027-03-13')).toHaveAttribute('data-today')
  })

  afterEach(() => vi.useRealTimers())

  it('opens on the selected month, then today', () => {
    const { unmount } = render(
      <Calendar today={TODAY} defaultSelected='2027-06-02' />
    )
    expect(screen.getByRole('grid')).toHaveAccessibleName('June 2027')
    unmount()
    render(<Calendar today={TODAY} defaultMonth='2027-09-20' />)
    expect(screen.getByRole('grid')).toHaveAccessibleName('September 2027')
  })

  it('hides days from other months unless asked', () => {
    const { unmount } = render(
      <Calendar today={TODAY} defaultMonth='2027-04-01' />
    )
    expect(
      screen.queryByRole('button', { name: 'Wednesday, 31 March 2027' })
    ).toBeNull()
    unmount()
    render(<Calendar today={TODAY} defaultMonth='2027-04-01' showOutsideDays />)
    const outside = screen.getByRole('button', {
      name: 'Wednesday, 31 March 2027'
    })
    expect(outside).toHaveAttribute('data-outside')
    expect(outside.tabIndex).toBe(-1)
  })

  it('keeps six weeks with fixedWeeks', () => {
    render(<Calendar today={TODAY} fixedWeeks />)
    expect(within(screen.getByRole('grid')).getAllByRole('row')).toHaveLength(7)
  })

  describe('single', () => {
    it('selects a day and reports it', async () => {
      const onSelect = vi.fn()
      render(<Calendar today={TODAY} onSelect={onSelect} />)
      await userEvent.click(day('2027-03-14'))
      expect(onSelect).toHaveBeenCalledWith('2027-03-14')
      expect(day('2027-03-14')).toHaveAttribute('data-selected')
      expect(cellOf('2027-03-14')).toHaveAttribute('aria-selected', 'true')
      expect(cellOf('2027-03-15')).toHaveAttribute('aria-selected', 'false')
      expect(live()).toHaveTextContent('Selected Sunday, 14 March 2027')
    })

    it('clears the day on a second press unless required', async () => {
      const onSelect = vi.fn()
      const { unmount } = render(
        <Calendar
          today={TODAY}
          defaultSelected='2027-03-14'
          onSelect={onSelect}
        />
      )
      await userEvent.click(day('2027-03-14'))
      expect(onSelect).toHaveBeenLastCalledWith(null)
      unmount()
      render(
        <Calendar
          today={TODAY}
          defaultSelected='2027-03-14'
          required
          onSelect={onSelect}
        />
      )
      await userEvent.click(day('2027-03-14'))
      expect(day('2027-03-14')).toHaveAttribute('data-selected')
    })

    it('follows a controlled value', async () => {
      const onSelect = vi.fn()
      render(
        <Calendar today={TODAY} selected='2027-03-02' onSelect={onSelect} />
      )
      await userEvent.click(day('2027-03-14'))
      expect(onSelect).toHaveBeenCalledWith('2027-03-14')
      expect(day('2027-03-02')).toHaveAttribute('data-selected')
      expect(day('2027-03-14')).not.toHaveAttribute('data-selected')
    })
  })

  it('keeps a controlled null selection empty', async () => {
    render(
      <Calendar today={TODAY} selected={null} defaultSelected='2027-03-02' />
    )
    expect(day('2027-03-02')).not.toHaveAttribute('data-selected')
  })

  it('toggles days in multiple mode', async () => {
    const onSelect = vi.fn()
    render(<Calendar today={TODAY} mode='multiple' onSelect={onSelect} />)
    await userEvent.click(day('2027-03-14'))
    await userEvent.click(day('2027-03-02'))
    expect(onSelect).toHaveBeenLastCalledWith(['2027-03-02', '2027-03-14'])
    await userEvent.click(day('2027-03-14'))
    expect(onSelect).toHaveBeenLastCalledWith(['2027-03-02'])
    expect(live()).toHaveTextContent('Deselected Sunday, 14 March 2027')
  })

  describe('range', () => {
    it('selects a start, then an end, and marks the span', async () => {
      const onSelect = vi.fn()
      render(<Calendar today={TODAY} mode='range' onSelect={onSelect} />)
      await userEvent.click(day('2027-03-07'))
      expect(onSelect).toHaveBeenLastCalledWith({
        start: '2027-03-07',
        end: null
      })
      await userEvent.click(day('2027-03-03'))
      expect(onSelect).toHaveBeenLastCalledWith({
        start: '2027-03-03',
        end: '2027-03-07'
      })
      expect(day('2027-03-03')).toHaveAttribute('data-range-start')
      expect(day('2027-03-05')).toHaveAttribute('data-range-middle')
      expect(day('2027-03-07')).toHaveAttribute('data-range-end')
      for (const date of ['2027-03-03', '2027-03-05', '2027-03-07'])
        expect(cellOf(date)).toHaveAttribute('aria-selected', 'true')
      expect(live()).toHaveTextContent(
        'Selected Wednesday, 3 to Sunday, 7 March 2027'
      )
    })

    it('previews the range under the pointer', async () => {
      render(
        <Calendar
          today={TODAY}
          mode='range'
          defaultSelected={{ start: '2027-03-03', end: null }}
        />
      )
      fireEvent.pointerEnter(day('2027-03-06'), { pointerType: 'mouse' })
      for (const date of ['2027-03-03', '2027-03-04', '2027-03-06'])
        expect(day(date)).toHaveAttribute('data-range-preview')
      expect(day('2027-03-07')).not.toHaveAttribute('data-range-preview')
      expect(day('2027-03-06')).toHaveAttribute('data-range-end')
      expect(cellOf('2027-03-04')).toHaveAttribute('aria-selected', 'false')
    })

    it('marks days that break min or max, and restarts the range there', async () => {
      const onSelect = vi.fn()
      render(
        <Calendar
          today={TODAY}
          mode='range'
          min={3}
          max={5}
          onSelect={onSelect}
        />
      )
      await userEvent.click(day('2027-03-10'))
      for (const date of ['2027-03-11', '2027-03-15', '2027-03-05'])
        expect(day(date)).toHaveAttribute('data-out-of-range')
      for (const date of [
        '2027-03-12',
        '2027-03-14',
        '2027-03-06',
        '2027-03-10'
      ])
        expect(day(date)).not.toHaveAttribute('data-out-of-range')
      expect(day('2027-03-15')).not.toHaveAttribute('aria-disabled')
      fireEvent.pointerEnter(day('2027-03-20'), { pointerType: 'mouse' })
      expect(day('2027-03-12')).not.toHaveAttribute('data-range-preview')
      await userEvent.click(day('2027-03-20'))
      expect(onSelect).toHaveBeenLastCalledWith({
        start: '2027-03-20',
        end: null
      })
      await userEvent.click(day('2027-03-16'))
      expect(onSelect).toHaveBeenLastCalledWith({
        start: '2027-03-16',
        end: '2027-03-20'
      })
    })

    it('lets Escape drop a started range', async () => {
      const onSelect = vi.fn()
      render(<Calendar today={TODAY} mode='range' onSelect={onSelect} />)
      await userEvent.click(day('2027-03-07'))
      await userEvent.keyboard('{Escape}')
      expect(onSelect).toHaveBeenLastCalledWith({ start: null, end: null })
    })
  })

  describe('disabled', () => {
    it.each([
      ['a date', '2027-03-14', '2027-03-14'],
      ['before', { before: TODAY }, '2027-03-09'],
      ['after', { after: TODAY }, '2027-03-11'],
      ['a range', { start: '2027-03-12', end: '2027-03-16' }, '2027-03-16'],
      ['weekdays', { dayOfWeek: [6, 7] }, '2027-03-13'],
      ['a test', (date: string) => date === '2027-03-20', '2027-03-20']
    ])('disables days by %s, still focusable', async (_, disabled, date) => {
      const onSelect = vi.fn()
      render(<Calendar today={TODAY} disabled={disabled} onSelect={onSelect} />)
      expect(day(date)).toHaveAttribute('aria-disabled', 'true')
      expect(day(date)).toHaveAttribute('data-disabled')
      expect(day(date)).not.toBeDisabled()
      fireEvent.click(day(date))
      expect(onSelect).not.toHaveBeenCalled()
    })

    it('disables every day and the navigation with true', () => {
      render(<Calendar today={TODAY} disabled />)
      expect(day('2027-03-14')).toHaveAttribute('aria-disabled', 'true')
      expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled()
    })
  })

  it('names each day with whether it is today or selected', () => {
    render(<Calendar today={TODAY} defaultSelected='2027-03-14' />)
    expect(day(TODAY)).toHaveAccessibleName('Today, Wednesday, 10 March 2027')
    expect(day('2027-03-14')).toHaveAccessibleName(
      'Sunday, 14 March 2027, selected'
    )
  })

  it('marks a grid that takes several days as multiselectable', () => {
    const { unmount } = render(<Calendar today={TODAY} />)
    expect(screen.getByRole('grid')).not.toHaveAttribute('aria-multiselectable')
    unmount()
    render(<Calendar today={TODAY} mode='range' />)
    expect(screen.getByRole('grid')).toHaveAttribute(
      'aria-multiselectable',
      'true'
    )
  })

  it('reports nothing when a required last date is pressed again', async () => {
    const onSelect = vi.fn()
    render(
      <Calendar
        today={TODAY}
        mode='multiple'
        required
        defaultSelected={['2027-03-14']}
        onSelect={onSelect}
      />
    )
    await userEvent.click(day('2027-03-14'))
    expect(onSelect).not.toHaveBeenCalled()
    expect(live()).toHaveTextContent('')
  })

  it('shows at least one month', () => {
    render(<Calendar today={TODAY} numberOfMonths={0} />)
    expect(screen.getAllByRole('grid')).toHaveLength(1)
  })

  it('follows today to a new month until the reader turns the page', async () => {
    const { rerender } = render(<Calendar today='2027-03-31' />)
    rerender(<Calendar today='2027-04-01' />)
    expect(screen.getByRole('grid')).toHaveAccessibleName('April 2027')
    await userEvent.click(screen.getByRole('button', { name: 'Next month' }))
    rerender(<Calendar today='2027-04-02' />)
    expect(screen.getByRole('grid')).toHaveAccessibleName('May 2027')
  })

  it('writes Gregorian labels whatever calendar the locale prefers', () => {
    render(<Calendar today={TODAY} locale='th-TH' captionLayout='dropdown' />)
    expect(
      screen.getByRole('grid').getAttribute('aria-labelledby')
    ).toBeTruthy()
    expect(screen.getByRole('grid')).toHaveAccessibleName(/2027/)
    expect(day('2027-03-14')).toHaveAccessibleName(/2027/)
  })

  it.each(['multiple', 'range'] as const)(
    'starts empty when an uncontrolled calendar changes to %s mode',
    async (mode) => {
      const { rerender } = render(<Calendar today={TODAY} />)
      rerender(<Calendar today={TODAY} mode={mode} />)
      expect(screen.getByRole('grid')).toHaveAccessibleName('March 2027')
      await userEvent.click(day('2027-03-14'))
      expect(day('2027-03-14')).toHaveAttribute('data-selected')
    }
  )

  it('keeps a disabled calendar on its month and its range', async () => {
    const onMonthChange = vi.fn()
    const onSelect = vi.fn()
    render(
      <Calendar
        today='2027-03-31'
        mode='range'
        disabled
        defaultSelected={{ start: '2027-03-30', end: null }}
        onMonthChange={onMonthChange}
        onSelect={onSelect}
      />
    )
    act(() => day('2027-03-31').focus())
    await userEvent.keyboard('{ArrowRight}{PageDown}')
    expect(screen.getByRole('grid')).toHaveAccessibleName('March 2027')
    expect(onMonthChange).not.toHaveBeenCalled()
    await userEvent.keyboard('{ArrowLeft}')
    expect(day('2027-03-30')).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    expect(onSelect).not.toHaveBeenCalled()
  })

  describe('today', () => {
    afterEach(() => {
      cleanup()
      vi.useRealTimers()
    })

    it('moves to the next day at midnight in its zone', () => {
      vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
      // 11:59:30pm on 31 March in Sydney.
      vi.setSystemTime(new Date('2027-03-31T12:59:30Z'))
      render(<Calendar timeZone='Australia/Sydney' />)
      expect(day('2027-03-31')).toHaveAttribute('data-today')
      act(() => vi.advanceTimersByTime(60_000))
      expect(screen.getByRole('grid')).toHaveAccessibleName('April 2027')
      expect(day('2027-04-01')).toHaveAttribute('data-today')
    })

    it('catches up when a hidden tab is shown again', () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2027-03-10T01:00:00Z'))
      render(<Calendar timeZone='Australia/Sydney' />)
      vi.setSystemTime(new Date('2027-03-12T01:00:00Z'))
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'))
      })
      expect(day('2027-03-12')).toHaveAttribute('data-today')
    })

    async function hydrate(html: string, calendar: React.ReactElement) {
      const container = document.createElement('div')
      container.innerHTML = html
      document.body.append(container)
      const onRecoverableError = vi.fn()
      const root = await act(async () =>
        hydrateRoot(container, calendar, { onRecoverableError })
      )
      onTestFinished(() => {
        act(() => root.unmount())
        container.remove()
      })
      return onRecoverableError
    }

    it('hydrates server HTML from the day before without a mismatch', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2027-03-31T05:00:00Z'))
      const html = renderToString(<Calendar timeZone='Australia/Sydney' />)
      vi.setSystemTime(new Date('2027-04-01T05:00:00Z'))
      const onRecoverableError = await hydrate(
        html,
        <Calendar timeZone='Australia/Sydney' />
      )
      expect(onRecoverableError).not.toHaveBeenCalled()
      expect(screen.getByRole('grid')).toHaveAccessibleName('April 2027')
      expect(day('2027-04-01')).toHaveAttribute('data-today')
    })

    it('places autoFocus on today once hydration knows it', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2027-04-01T05:00:00Z'))
      const calendar = <Calendar timeZone='Australia/Sydney' autoFocus />
      await hydrate(renderToString(calendar), calendar)
      expect(day('2027-04-01')).toHaveFocus()
    })
  })

  it('shows no more months than startMonth to endMonth holds', () => {
    render(
      <Calendar
        today={TODAY}
        numberOfMonths={3}
        startMonth='2027-03-01'
        endMonth='2027-04-30'
      />
    )
    expect(screen.getAllByRole('grid')).toHaveLength(2)
    expect(screen.getAllByRole('grid')[1]).toHaveAccessibleName('April 2027')
  })

  it('disables month options that would turn past the bounds', () => {
    render(
      <Calendar
        today={TODAY}
        numberOfMonths={2}
        captionLayout='dropdown'
        startMonth='2027-03-01'
        endMonth='2027-06-30'
      />
    )
    const [first, second] = screen.getAllByRole('combobox', { name: 'Month' })
    const option = (select: HTMLElement, name: string) =>
      within(select).getByRole('option', { name }) as HTMLOptionElement
    expect(option(first!, 'May').disabled).toBe(false)
    expect(option(first!, 'June').disabled).toBe(true)
    expect(option(second!, 'April').disabled).toBe(false)
    expect(option(second!, 'March').disabled).toBe(true)
  })

  it.each([
    ['focus leaves and comes back', false],
    ['the month arrows turn the page', true]
  ])('keeps moving focus by key after %s', async (_, turnPage) => {
    render(
      <>
        <Calendar today={TODAY} />
        <input aria-label='After' />
      </>
    )
    act(() => day(TODAY).focus())
    await userEvent.keyboard('{ArrowRight}')
    expect(day('2027-03-11')).toHaveFocus()
    if (turnPage) {
      await userEvent.click(screen.getByRole('button', { name: 'Next month' }))
      await userEvent.click(
        screen.getByRole('button', { name: 'Previous month' })
      )
      act(() => day('2027-03-11').focus())
    } else {
      await userEvent.tab()
      expect(screen.getByRole('textbox', { name: 'After' })).toHaveFocus()
      await userEvent.tab({ shift: true })
      expect(day('2027-03-11')).toHaveFocus()
    }
    await userEvent.keyboard('{ArrowRight}')
    expect(day('2027-03-12')).toHaveFocus()
    await userEvent.keyboard('{ArrowRight}')
    expect(day('2027-03-13')).toHaveFocus()
  })

  it('disables years that would turn past the bounds', () => {
    render(
      <Calendar
        today='2026-12-10'
        numberOfMonths={2}
        captionLayout='dropdown'
        startMonth='2026-12-01'
        endMonth='2027-01-31'
      />
    )
    const second = screen.getAllByRole('combobox', { name: 'Year' })[1]!
    const option = (name: string) =>
      within(second).getByRole('option', { name }) as HTMLOptionElement
    expect(option('2026').disabled).toBe(true)
    expect(option('2027').disabled).toBe(false)
  })

  it('enables a year that holds an allowed month, and lands on it', async () => {
    render(
      <Calendar
        today='2026-12-10'
        captionLayout='dropdown'
        startMonth='2026-12-01'
        endMonth='2027-01-31'
      />
    )
    const year = screen.getByRole('combobox', { name: 'Year' })
    const option = within(year).getByRole('option', {
      name: '2027'
    }) as HTMLOptionElement
    expect(option.disabled).toBe(false)
    await userEvent.selectOptions(year, '2027')
    expect(screen.getByRole('grid')).toHaveAccessibleName('January 2027')
  })

  it('focuses the day once a controlled parent shows its month', async () => {
    function Deferred() {
      const [month, setMonth] = useState('2027-03-01')
      return (
        <Calendar
          today='2027-03-31'
          month={month}
          onMonthChange={(next) => setTimeout(() => setMonth(next), 10)}
        />
      )
    }
    render(<Deferred />)
    act(() => day('2027-03-31').focus())
    await userEvent.keyboard('{ArrowRight}')
    await waitFor(() =>
      expect(screen.getByRole('grid')).toHaveAccessibleName('April 2027')
    )
    await waitFor(() => expect(day('2027-04-01')).toHaveFocus())
  })

  it('names days with modifiers as data attributes', () => {
    render(
      <Calendar
        today={TODAY}
        modifiers={{
          hasSession: ['2027-03-12', '2027-03-13'],
          soldOut: { dayOfWeek: [1] }
        }}
      />
    )
    expect(day('2027-03-12')).toHaveAttribute('data-has-session')
    expect(day('2027-03-14')).not.toHaveAttribute('data-has-session')
    expect(day('2027-03-15')).toHaveAttribute('data-sold-out')
  })

  describe('months', () => {
    it('steps months and announces the new one', async () => {
      const onMonthChange = vi.fn()
      render(<Calendar today={TODAY} onMonthChange={onMonthChange} />)
      expect(live()).toHaveTextContent('')
      await userEvent.click(screen.getByRole('button', { name: 'Next month' }))
      expect(screen.getByRole('grid')).toHaveAccessibleName('April 2027')
      expect(onMonthChange).toHaveBeenLastCalledWith('2027-04-01')
      expect(live()).toHaveTextContent('April 2027')
      await userEvent.click(
        screen.getByRole('button', { name: 'Previous month' })
      )
      await userEvent.click(
        screen.getByRole('button', { name: 'Previous month' })
      )
      expect(screen.getByRole('grid')).toHaveAccessibleName('February 2027')
    })

    it('follows a controlled month', async () => {
      function Controlled() {
        const [month, setMonth] = useState('2027-03-01')
        return (
          <>
            <Calendar today={TODAY} month={month} onMonthChange={setMonth} />
            <button type='button' onClick={() => setMonth('2028-01-15')}>
              Jump
            </button>
          </>
        )
      }
      render(<Controlled />)
      await userEvent.click(screen.getByRole('button', { name: 'Next month' }))
      expect(screen.getByRole('grid')).toHaveAccessibleName('April 2027')
      await userEvent.click(screen.getByRole('button', { name: 'Jump' }))
      expect(screen.getByRole('grid')).toHaveAccessibleName('January 2028')
    })

    it('stays inside startMonth and endMonth', async () => {
      render(
        <Calendar today={TODAY} startMonth='2027-03-01' endMonth='2027-04-30' />
      )
      expect(
        screen.getByRole('button', { name: 'Previous month' })
      ).toBeDisabled()
      await userEvent.click(screen.getByRole('button', { name: 'Next month' }))
      expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled()
    })

    it('shows several months, with the arrows at either end', () => {
      render(<Calendar today={TODAY} numberOfMonths={2} />)
      const grids = screen.getAllByRole('grid')
      expect(grids).toHaveLength(2)
      expect(grids[0]).toHaveAccessibleName('March 2027')
      expect(grids[1]).toHaveAccessibleName('April 2027')
      expect(
        screen.getAllByRole('button', { name: 'Next month' })
      ).toHaveLength(1)
    })

    it('picks a month and a year from dropdowns', async () => {
      const onMonthChange = vi.fn()
      render(
        <Calendar
          today={TODAY}
          captionLayout='dropdown'
          onMonthChange={onMonthChange}
        />
      )
      await userEvent.selectOptions(
        screen.getByRole('combobox', { name: 'Month' }),
        'July'
      )
      await userEvent.selectOptions(
        screen.getByRole('combobox', { name: 'Year' }),
        '2029'
      )
      expect(onMonthChange).toHaveBeenLastCalledWith('2029-07-01')
      expect(screen.getByRole('grid')).toHaveAccessibleName('July 2029')
    })

    it('moves the month when a key takes focus past it', async () => {
      render(<Calendar today='2027-03-31' />)
      act(() => day('2027-03-31').focus())
      await userEvent.keyboard('{ArrowRight}')
      expect(screen.getByRole('grid')).toHaveAccessibleName('April 2027')
      expect(day('2027-04-01')).toHaveFocus()
      expect(live()).toHaveTextContent('April 2027')
    })
  })

  it('focuses the tab stop on mount with autoFocus', () => {
    render(<Calendar today={TODAY} defaultSelected='2027-03-20' autoFocus />)
    expect(day('2027-03-20')).toHaveFocus()
  })

  it('spreads other props onto the root', () => {
    const { container } = render(
      <Calendar today={TODAY} className='custom' id='cal' />
    )
    const root = container.firstElementChild!
    expect(root).toHaveAttribute('data-slot', 'calendar')
    expect(root).toHaveClass('custom')
    expect(root).toHaveAttribute('id', 'cal')
  })

  it('takes a controlled range', async () => {
    function Controlled() {
      const [range, setRange] = useState<CalendarDateRange>({
        start: '2027-03-03',
        end: '2027-03-05'
      })
      return (
        <Calendar
          today={TODAY}
          mode='range'
          selected={range}
          onSelect={setRange}
        />
      )
    }
    render(<Controlled />)
    expect(day('2027-03-04')).toHaveAttribute('data-range-middle')
    await userEvent.click(day('2027-03-20'))
    expect(day('2027-03-04')).not.toHaveAttribute('data-selected')
    expect(day('2027-03-20')).toHaveAttribute('data-range-start')
  })
})
