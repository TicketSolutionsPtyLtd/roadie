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

    it('marks days that break min or max, and keeps the start when one is pressed', async () => {
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
      onSelect.mockClear()
      await userEvent.click(day('2027-03-20'))
      expect(onSelect).not.toHaveBeenCalled()
      expect(day('2027-03-10')).toHaveAttribute('data-range-start')
      expect(screen.getByRole('status')).toHaveTextContent(
        'Ranges can be 3 to 5 days'
      )
      await userEvent.click(day('2027-03-13'))
      expect(onSelect).toHaveBeenLastCalledWith({
        start: '2027-03-10',
        end: '2027-03-13'
      })
    })

    it.each([
      [{ max: 14 }, '2027-03-30', 'Ranges can be up to 14 days'],
      [{ min: 3 }, '2027-03-11', 'Ranges must be at least 3 days'],
      [{ min: 2, max: 2 }, '2027-03-20', 'Ranges must be 2 days']
    ])('says why a press is refused with %o', async (limits, date, message) => {
      render(<Calendar today={TODAY} mode='range' {...limits} />)
      await userEvent.click(day('2027-03-10'))
      await userEvent.click(day(date))
      expect(screen.getByRole('status')).toHaveTextContent(message)
      expect(day('2027-03-10')).toHaveAttribute('data-range-start')
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
    expect(live()).toHaveTextContent('')
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

    it('moves on when daylight saving skips to midnight', () => {
      vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
      // 10:30pm on 27 March 2027 in Nuuk; at 11pm the clocks jump to midnight.
      vi.setSystemTime(new Date('2027-03-28T00:30:00Z'))
      render(<Calendar timeZone='America/Nuuk' />)
      expect(day('2027-03-27')).toHaveAttribute('data-today')
      act(() => vi.advanceTimersByTime(31 * 60_000))
      expect(day('2027-03-28')).toHaveAttribute('data-today')
    })

    it('wakes within the hour, so a sleeping laptop catches up', () => {
      vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
      // 10pm on 31 March in Sydney.
      vi.setSystemTime(new Date('2027-03-31T11:00:00Z'))
      render(<Calendar timeZone='Australia/Sydney' />)
      // The machine sleeps until 7am; its pending timers don't advance.
      vi.setSystemTime(new Date('2027-03-31T20:00:00Z'))
      act(() => vi.advanceTimersByTime(60 * 60_000))
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
      expect(live()).toHaveTextContent('')
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

  it('keeps the tab stop on the focused day while a parent ignores the turn', async () => {
    render(<Calendar today={TODAY} month='2027-03-01' />)
    act(() => day('2027-03-31').focus())
    await userEvent.keyboard('{ArrowRight}')
    expect(day('2027-03-31')).toHaveFocus()
    expect(day('2027-03-31')).toHaveAttribute('tabindex', '0')
    expect(day('2027-03-31')).toHaveAttribute('data-focused')
    expect(day(TODAY)).toHaveAttribute('tabindex', '-1')
  })

  it('drops a waiting focus request when focus moves to another control', async () => {
    function Deferred() {
      const [month, setMonth] = useState('2027-03-01')
      return (
        <Calendar
          today='2027-03-31'
          month={month}
          onMonthChange={(next) => setTimeout(() => setMonth(next), 50)}
        />
      )
    }
    render(<Deferred />)
    act(() => day('2027-03-31').focus())
    await userEvent.keyboard('{ArrowRight}')
    await userEvent.tab({ shift: true })
    const next = screen.getByRole('button', { name: 'Next month' })
    expect(next).toHaveFocus()
    await waitFor(() =>
      expect(screen.getByRole('grid')).toHaveAccessibleName('April 2027')
    )
    expect(next).toHaveFocus()
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

  describe('announcements follow what the calendar shows', () => {
    it('stays quiet when the mode changes', () => {
      const { rerender } = render(
        <Calendar today={TODAY} defaultSelected='2027-03-14' />
      )
      rerender(<Calendar today={TODAY} mode='multiple' />)
      expect(live()).toHaveTextContent('')
    })

    it('says what a parent did to several dates', () => {
      const { rerender } = render(
        <Calendar
          today={TODAY}
          mode='multiple'
          selected={['2027-03-02', '2027-03-14']}
        />
      )
      rerender(
        <Calendar
          today={TODAY}
          mode='multiple'
          selected={['2027-03-14', '2027-03-02']}
        />
      )
      expect(live()).toHaveTextContent('')
      rerender(
        <Calendar
          today={TODAY}
          mode='multiple'
          selected={['2027-03-01', '2027-03-02', '2027-03-03']}
        />
      )
      expect(live()).toHaveTextContent('3 dates selected')
      rerender(<Calendar today={TODAY} mode='multiple' selected={[]} />)
      expect(live()).toHaveTextContent('Selection cleared')
    })

    it('stays quiet when a controlled parent keeps its value', async () => {
      render(
        <Calendar
          today={TODAY}
          selected='2027-03-02'
          month='2027-03-01'
          onSelect={() => {}}
        />
      )
      await userEvent.click(day('2027-03-14'))
      await userEvent.click(screen.getByRole('button', { name: 'Next month' }))
      expect(live()).toHaveTextContent('')
    })

    it('stays quiet when a controlled range is kept on Escape', async () => {
      render(
        <Calendar
          today={TODAY}
          mode='range'
          selected={{ start: '2027-03-03', end: null }}
        />
      )
      act(() => day('2027-03-03').focus())
      await userEvent.keyboard('{Escape}')
      expect(live()).toHaveTextContent('')
    })

    it('speaks once a deferred parent applies the change', async () => {
      function Deferred() {
        const [date, setDate] = useState<string | null>(null)
        return (
          <Calendar
            today={TODAY}
            selected={date}
            onSelect={(next) => setTimeout(() => setDate(next), 10)}
          />
        )
      }
      render(<Deferred />)
      await userEvent.click(day('2027-03-14'))
      expect(live()).toHaveTextContent('')
      await waitFor(() =>
        expect(live()).toHaveTextContent('Selected Sunday, 14 March 2027')
      )
    })

    it('speaks changes the parent makes on its own', async () => {
      function External() {
        const [date, setDate] = useState<string | null>(null)
        const [month, setMonth] = useState('2027-03-01')
        return (
          <>
            <Calendar today={TODAY} selected={date} month={month} />
            <button type='button' onClick={() => setDate('2027-03-20')}>
              Pick
            </button>
            <button type='button' onClick={() => setMonth('2027-05-01')}>
              May
            </button>
          </>
        )
      }
      render(<External />)
      await userEvent.click(screen.getByRole('button', { name: 'Pick' }))
      expect(live()).toHaveTextContent('Selected Saturday, 20 March 2027')
      await userEvent.click(screen.getByRole('button', { name: 'May' }))
      expect(live()).toHaveTextContent('May 2027')
    })

    it('says both when one press selects and turns the page', async () => {
      render(
        <Calendar today={TODAY} defaultMonth='2027-04-01' showOutsideDays />
      )
      await userEvent.click(
        screen.getByRole('button', { name: 'Wednesday, 31 March 2027' })
      )
      expect(live()).toHaveTextContent(
        'March 2027. Selected Wednesday, 31 March 2027'
      )
    })
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

    it('shows several months, with one pair of arrows', () => {
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

describe('Calendar navigation', () => {
  it('puts the title first and both arrows after it', () => {
    render(<Calendar today={TODAY} />)
    const header = document.querySelector<HTMLElement>(
      '[data-slot="calendar-header"]'
    )!
    const [title, ...rest] = Array.from(header.children)
    expect(title).toHaveTextContent('March 2027')
    expect(
      within(header)
        .getAllByRole('button')
        .map((b) => b.ariaLabel)
    ).toEqual(['Previous month', 'Next month'])
    expect(rest).not.toHaveLength(0)
  })

  it('keeps both arrows together beside the last month of several', () => {
    render(<Calendar today={TODAY} numberOfMonths={2} />)
    const nav = document.querySelector('[data-slot="calendar-nav"]')!
    expect(within(nav as HTMLElement).getAllByRole('button')).toHaveLength(2)
  })

  it('marks its direction and keeps the arrow names when vertical', () => {
    render(<Calendar today={TODAY} direction='vertical' />)
    expect(document.querySelector('[data-slot="calendar"]')).toHaveAttribute(
      'data-direction',
      'vertical'
    )
    expect(
      screen.getByRole('button', { name: 'Next month' })
    ).toBeInTheDocument()
  })
})

describe('Calendar week view', () => {
  const grid = () => screen.getByRole('grid')
  const shownDays = () =>
    within(grid())
      .getAllByRole('button')
      .map((button) => button.dataset.date)

  it('shows the week holding the selection, then today', () => {
    const { unmount } = render(
      <Calendar view='week' today={TODAY} defaultSelected='2027-03-31' />
    )
    expect(shownDays()).toEqual([
      '2027-03-29',
      '2027-03-30',
      '2027-03-31',
      '2027-04-01',
      '2027-04-02',
      '2027-04-03',
      '2027-04-04'
    ])
    expect(grid()).toHaveAccessibleName(
      'Monday, 29 March to Sunday, 4 April 2027'
    )
    expect(
      document.querySelector('[data-slot="calendar-header"]')
    ).toHaveTextContent('March to April 2027')
    unmount()
    render(<Calendar view='week' today={TODAY} />)
    expect(shownDays()[0]).toBe('2027-03-08')
    expect(within(grid()).getAllByRole('row')).toHaveLength(2)
  })

  it('steps a week at a time and reports the month it moves into', async () => {
    const onMonthChange = vi.fn()
    render(<Calendar view='week' today={TODAY} onMonthChange={onMonthChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Next week' }))
    expect(shownDays()[0]).toBe('2027-03-15')
    expect(live()).toHaveTextContent('Monday, 15 to Sunday, 21 March 2027')
    expect(onMonthChange).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Next week' }))
    await userEvent.click(screen.getByRole('button', { name: 'Next week' }))
    expect(shownDays()[0]).toBe('2027-03-29')
    expect(onMonthChange).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Next week' }))
    expect(shownDays()[0]).toBe('2027-04-05')
    expect(onMonthChange).toHaveBeenLastCalledWith('2027-04-01')
    await userEvent.click(screen.getByRole('button', { name: 'Previous week' }))
    expect(shownDays()[0]).toBe('2027-03-29')
  })

  it('keeps a tab stop in a week away from today and the selection', async () => {
    render(<Calendar view='week' today={TODAY} />)
    await userEvent.click(screen.getByRole('button', { name: 'Next week' }))
    await userEvent.click(screen.getByRole('button', { name: 'Next week' }))
    await userEvent.click(screen.getByRole('button', { name: 'Next week' }))
    const stops = within(grid())
      .getAllByRole('button')
      .filter((button) => button.tabIndex === 0)
    expect(stops.map((button) => button.dataset.date)).toEqual(['2027-03-29'])
  })

  it('follows the keyboard into the next week', async () => {
    render(<Calendar view='week' today='2027-03-14' />)
    act(() => day('2027-03-14').focus())
    await userEvent.keyboard('{ArrowRight}')
    expect(shownDays()[0]).toBe('2027-03-15')
    expect(day('2027-03-15')).toHaveFocus()
    await userEvent.keyboard('{PageDown}')
    expect(shownDays()).toContain('2027-04-15')
    expect(day('2027-04-15')).toHaveFocus()
  })

  it('stops at startMonth and endMonth', () => {
    render(
      <Calendar
        view='week'
        today='2027-03-02'
        startMonth='2027-03-01'
        endMonth='2027-03-31'
      />
    )
    expect(screen.getByRole('button', { name: 'Previous week' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next week' })).toBeEnabled()
  })

  it('opens on the first week of a controlled month it moves to', () => {
    const { rerender } = render(
      <Calendar view='week' today={TODAY} month='2027-03-01' />
    )
    expect(shownDays()[0]).toBe('2027-03-08')
    rerender(<Calendar view='week' today={TODAY} month='2027-05-01' />)
    expect(shownDays()[0]).toBe('2027-04-26')
  })

  it('switches between week and month with the views toggle', async () => {
    const onViewChange = vi.fn()
    render(
      <Calendar
        today={TODAY}
        views={['week', 'month']}
        defaultView='week'
        onViewChange={onViewChange}
      />
    )
    const toggle = screen.getByRole('button', { name: 'Month view' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(toggle)
    expect(onViewChange).toHaveBeenLastCalledWith('month')
    expect(grid()).toHaveAccessibleName('March 2027')
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(toggle)
    expect(shownDays()[0]).toBe('2027-03-08')
  })

  it('puts the view toggle beside the title, before the arrows', () => {
    render(<Calendar today={TODAY} views={['week', 'month']} />)
    const header = document.querySelector<HTMLElement>(
      '[data-slot="calendar-header"]'
    )!
    expect(
      within(header)
        .getAllByRole('button')
        .map((button) => button.ariaLabel)
    ).toEqual(['Month view', 'Previous month', 'Next month'])
  })

  it('names every month and keeps the toggle in place with several months', async () => {
    render(
      <Calendar
        today={TODAY}
        numberOfMonths={2}
        views={['week', 'month']}
        defaultView='week'
      />
    )
    const toggle = screen.getByRole('button', { name: 'Month view' })
    act(() => toggle.focus())
    await userEvent.keyboard(' ')
    const [march, april] = screen.getAllByRole('grid')
    expect(march).toHaveAccessibleName('March 2027')
    expect(april).toHaveAccessibleName('April 2027')
    expect(toggle).toHaveFocus()
    await userEvent.keyboard(' ')
    expect(toggle).toHaveFocus()
  })

  it('keeps the week the reader turned to after a look at the month', async () => {
    render(
      <Calendar
        today='2027-03-04'
        defaultView='week'
        views={['week', 'month']}
      />
    )
    for (let i = 0; i < 5; i++)
      await userEvent.click(screen.getByRole('button', { name: 'Next week' }))
    expect(shownDays()[0]).toBe('2027-04-05')
    const toggle = screen.getByRole('button', { name: 'Month view' })
    await userEvent.click(toggle)
    await userEvent.click(toggle)
    expect(shownDays()[0]).toBe('2027-04-05')
  })

  it('follows a day chosen in month view when a parent switches back to week', async () => {
    function Controlled() {
      const [view, setView] = useState<'week' | 'month'>('week')
      return (
        <>
          <Calendar today={TODAY} view={view} />
          <button
            type='button'
            onClick={() => setView(view === 'week' ? 'month' : 'week')}
          >
            Switch
          </button>
        </>
      )
    }
    render(<Controlled />)
    for (let i = 0; i < 3; i++)
      await userEvent.click(screen.getByRole('button', { name: 'Next week' }))
    await userEvent.click(screen.getByRole('button', { name: 'Switch' }))
    await userEvent.click(day('2027-03-10'))
    await userEvent.click(screen.getByRole('button', { name: 'Switch' }))
    expect(shownDays()).toContain('2027-03-10')
  })

  it('stays quiet for a later switch the parent makes', async () => {
    function Controlled() {
      const [view, setView] = useState<'week' | 'month'>('week')
      return (
        <>
          <Calendar
            today={TODAY}
            view={view}
            views={['week', 'month']}
            onViewChange={setView}
          />
          <button type='button' onClick={() => setView('week')}>
            Week
          </button>
          <button type='button' onClick={() => setView('month')}>
            Month
          </button>
        </>
      )
    }
    render(<Controlled />)
    await userEvent.click(screen.getByRole('button', { name: 'Month view' }))
    expect(live()).toHaveTextContent('March 2027')
    await userEvent.click(screen.getByRole('button', { name: 'Week' }))
    await userEvent.click(day('2027-03-11'))
    expect(live()).toHaveTextContent('Selected Thursday, 11 March 2027')
    await userEvent.click(screen.getByRole('button', { name: 'Month' }))
    expect(live()).toHaveTextContent('Selected Thursday, 11 March 2027')
  })

  it('drops a turned week when a month is picked from the selects', async () => {
    render(
      <Calendar
        view='week'
        captionLayout='dropdown'
        today='2027-03-04'
        defaultSelected='2027-04-20'
      />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Next week' }))
    const month = screen.getByRole('combobox', { name: 'Month' })
    await userEvent.selectOptions(month, 'June')
    await userEvent.selectOptions(month, 'April')
    expect(shownDays()).toContain('2027-04-20')
  })

  it('keeps a turned week when focus only passes through the month', async () => {
    render(
      <Calendar
        today='2027-03-04'
        defaultView='week'
        views={['week', 'month']}
      />
    )
    for (let i = 0; i < 5; i++)
      await userEvent.click(screen.getByRole('button', { name: 'Next week' }))
    const toggle = screen.getByRole('button', { name: 'Month view' })
    await userEvent.click(toggle)
    await userEvent.tab()
    await userEvent.tab()
    await userEvent.tab()
    await userEvent.tab({ shift: true })
    await userEvent.tab({ shift: true })
    await userEvent.tab({ shift: true })
    expect(toggle).toHaveFocus()
    await userEvent.keyboard(' ')
    expect(shownDays()[0]).toBe('2027-04-05')
  })

  it('stays quiet when only the layout changes', () => {
    const { rerender } = render(
      <Calendar today={TODAY} view='week' layout='scroll' />
    )
    rerender(<Calendar today={TODAY} view='week' layout='paged' />)
    expect(live()).toHaveTextContent('')
  })

  it('opens on a listed view when defaultView is not listed', () => {
    render(<Calendar today={TODAY} views={['week']} defaultView='month' />)
    expect(shownDays()).toHaveLength(7)
  })

  it('gives each day its own content id when a date shows twice', () => {
    render(
      <Calendar
        today={TODAY}
        numberOfMonths={2}
        showOutsideDays
        getDayContent={() => '$29'}
      />
    )
    const ids = Array.from(
      document.querySelectorAll('[data-slot="calendar-day-content"]'),
      (node) => node.id
    )
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('puts the arrows before the days with several months', () => {
    render(<Calendar today={TODAY} numberOfMonths={2} />)
    const order = Array.from(
      document.querySelectorAll('[data-slot="calendar"] button'),
      (node) => node.getAttribute('aria-label')
    )
    expect(order.slice(0, 2)).toEqual(['Previous month', 'Next month'])
  })

  it('returns to the week of the chosen day after paging months', async () => {
    render(
      <Calendar today={TODAY} defaultView='week' views={['week', 'month']} />
    )
    const toggle = screen.getByRole('button', { name: 'Month view' })
    for (let i = 0; i < 3; i++)
      await userEvent.click(screen.getByRole('button', { name: 'Next week' }))
    await userEvent.click(toggle)
    await userEvent.click(screen.getByRole('button', { name: 'Next month' }))
    await userEvent.click(day('2027-04-20'))
    await userEvent.click(toggle)
    expect(shownDays()).toContain('2027-04-20')
  })

  it('announces what a view switch shows', async () => {
    render(
      <Calendar
        today='2027-06-02'
        defaultView='week'
        views={['week', 'month']}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Month view' }))
    expect(live()).toHaveTextContent('June 2027')
    await userEvent.click(screen.getByRole('button', { name: 'Month view' }))
    expect(live()).toHaveTextContent('Monday, 31 May to Sunday, 6 June 2027')
  })

  it('opens on the only view listed', () => {
    render(<Calendar today={TODAY} views={['week']} />)
    expect(shownDays()).toHaveLength(7)
  })

  it('follows a controlled view', async () => {
    render(<Calendar today={TODAY} view='month' views={['week', 'month']} />)
    await userEvent.click(screen.getByRole('button', { name: 'Month view' }))
    expect(grid()).toHaveAccessibleName('March 2027')
  })

  it('shows months as a list when the layout scrolls', () => {
    render(<Calendar today={TODAY} view='week' layout='scroll' />)
    expect(
      screen.getAllByRole('grid')[0]!.getAttribute('aria-labelledby')
    ).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Next week' })).toBeNull()
  })
})

describe('Calendar day content', () => {
  const content = (date: string) =>
    date === '2027-03-03'
      ? 'Sold out'
      : date >= '2027-03-04' && date <= '2027-03-07'
        ? `$29`
        : null

  it('adds content under the number and describes the day with it', () => {
    render(<Calendar today={TODAY} getDayContent={content} />)
    const thursday = day('2027-03-04')
    expect(thursday).toHaveTextContent('4$29')
    expect(thursday).toHaveAccessibleName('Thursday, 4 March 2027')
    expect(thursday).toHaveAccessibleDescription('$29')
    expect(thursday).toHaveAttribute('data-content', '')
    expect(day('2027-03-01')).not.toHaveAttribute('data-content')
    expect(day('2027-03-01')).not.toHaveAttribute('aria-describedby')
  })

  it('strikes through a disabled day that has content', () => {
    render(
      <Calendar
        today={TODAY}
        getDayContent={content}
        disabled={['2027-03-03', '2027-03-01']}
      />
    )
    const struck = (date: string) =>
      day(date).querySelector('[data-slot="calendar-day-number"]')!
    expect(struck('2027-03-03')).toHaveClass('line-through')
    expect(struck('2027-03-01')).not.toHaveClass('line-through')
  })

  it('draws tiles in week view and wherever days have content', () => {
    const { rerender } = render(<Calendar today={TODAY} />)
    expect(
      document.querySelector('[data-slot="calendar"]')
    ).not.toHaveAttribute('data-tiles')
    rerender(<Calendar today={TODAY} getDayContent={content} />)
    expect(document.querySelector('[data-slot="calendar"]')).toHaveAttribute(
      'data-tiles',
      ''
    )
    rerender(<Calendar today={TODAY} view='week' />)
    expect(document.querySelector('[data-slot="calendar"]')).toHaveAttribute(
      'data-tiles',
      ''
    )
  })
})
