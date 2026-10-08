import { useState } from 'react'

import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { DateRangeValue } from '@oztix/roadie-core/datetime'

import { DateRangePicker } from '.'
import { onPhone } from '../../pickers/testUtils'
import { Field } from '../Field'
import type { DateRangePreset } from './range'

// Wed 7 Oct 2026.
const TODAY = '2026-10-07'

const day = (date: string) =>
  document.querySelector<HTMLButtonElement>(
    `[data-slot="calendar"] button[data-date="${date}"]:not([data-outside])`
  )!

const trigger = () => screen.getByRole('button', { name: /^Choose dates/ })

// An app's own presets with fixed dates, ending yesterday.
const FIXED_PRESETS = [
  { value: { start: '2026-09-06', end: '2026-10-05' }, label: 'Last 30 days' },
  {
    value: { start: '2025-07-01', end: '2026-06-30' },
    label: 'Last financial year'
  },
  { value: { direction: 'next', amount: 30, unit: 'day' } }
] satisfies DateRangePreset[]

async function open() {
  await userEvent.click(trigger())
  return screen.findByRole('dialog')
}

describe('DateRangePicker', () => {
  it.each([
    [undefined, 'emphasis-normal'],
    ['normal', 'emphasis-normal'],
    ['subtle', 'bg-subtle'],
    ['subtler', 'emphasis-subtler']
  ] as const)('styles a %s trigger with %s', (emphasis, className) => {
    render(
      <DateRangePicker aria-label='Period' today={TODAY} emphasis={emphasis} />
    )
    expect(trigger()).toHaveClass(className)
    expect(trigger()).not.toHaveClass('emphasis-raised')
  })

  it('shows a placeholder until a range is chosen', () => {
    render(<DateRangePicker aria-label='Period' today={TODAY} />)
    expect(trigger()).toHaveTextContent('Choose dates')
    expect(trigger()).toHaveAccessibleName('Choose dates, Period')
  })

  it('shows a relative range in words with the dates it stands for', () => {
    render(
      <DateRangePicker
        aria-label='Period'
        today={TODAY}
        defaultValue={{ direction: 'past', amount: 7, unit: 'day' }}
      />
    )
    expect(trigger()).toHaveTextContent('Last 7 days')
    expect(trigger()).toHaveTextContent('1 to 7 Oct 2026')
    expect(trigger()).toHaveAccessibleName(
      'Choose dates, Period (Last 7 days, 1 to 7 Oct 2026)'
    )
  })

  it('names fixed dates after the preset they match', () => {
    render(
      <DateRangePicker
        aria-label='Period'
        today={TODAY}
        presets={FIXED_PRESETS}
        defaultValue={{ start: '2026-09-06', end: '2026-10-05' }}
      />
    )
    expect(trigger()).toHaveTextContent('Last 30 days 6 Sept to 5 Oct 2026')
    expect(trigger()).toHaveAccessibleName(
      'Choose dates, Period (Last 30 days, 6 Sept to 5 Oct 2026)'
    )
  })

  it('shows an unlabelled fixed preset’s dates once', () => {
    render(
      <DateRangePicker
        aria-label='Period'
        today={TODAY}
        presets={[{ value: { start: '2026-09-01', end: '2026-09-30' } }]}
        defaultValue={{ start: '2026-09-01', end: '2026-09-30' }}
      />
    )
    expect(trigger()).toHaveAccessibleName(
      'Choose dates, Period (1 to 30 Sept 2026)'
    )
  })

  it('shows only the dates of fixed dates no preset matches', () => {
    render(
      <DateRangePicker
        aria-label='Period'
        today={TODAY}
        presets={FIXED_PRESETS}
        defaultValue={{ start: '2026-09-06', end: '2026-10-04' }}
      />
    )
    expect(trigger()).toHaveAccessibleName(
      'Choose dates, Period (6 Sept to 4 Oct 2026)'
    )
  })

  it('names a relative range after its preset’s own label', () => {
    render(
      <DateRangePicker
        aria-label='Period'
        today={TODAY}
        presets={[
          {
            value: { direction: 'past', amount: 7, unit: 'day' },
            label: 'This past week'
          }
        ]}
        defaultValue={{ direction: 'past', amount: 7, unit: 'day' }}
      />
    )
    expect(trigger()).toHaveAccessibleName(
      'Choose dates, Period (This past week, 1 to 7 Oct 2026)'
    )
  })

  it('takes its name, description and state from Field', () => {
    render(
      <Field invalid>
        <Field.Label>Sales period</Field.Label>
        <DateRangePicker today={TODAY} defaultValue='yesterday' />
        <Field.HelperText>Helps</Field.HelperText>
        <Field.ErrorText>Choose a period with sales</Field.ErrorText>
      </Field>
    )
    expect(trigger()).toHaveAccessibleName(
      'Choose dates, Sales period (Yesterday, 6 Oct 2026)'
    )
    expect(trigger()).toHaveAccessibleDescription('Choose a period with sales')
    expect(trigger()).toHaveAttribute('aria-invalid', 'true')
  })

  it('keeps two pickers apart by name', () => {
    render(
      <>
        <DateRangePicker aria-label='On sale' today={TODAY} />
        <DateRangePicker aria-label='Event dates' today={TODAY} />
      </>
    )
    expect(
      screen.getByRole('button', { name: 'Choose dates, On sale' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Choose dates, Event dates' })
    ).toBeInTheDocument()
  })

  describe('presets', () => {
    it('lists the default presets in groups and marks the chosen one', async () => {
      render(
        <DateRangePicker
          aria-label='Period'
          today={TODAY}
          defaultValue={{ period: 'month', offset: 0, toDate: true }}
        />
      )
      const dialog = await open()
      expect(dialog).toHaveAccessibleName('Choose dates, Period')
      const recent = within(dialog).getByRole('group', { name: 'Recent' })
      expect(
        within(recent).getByRole('button', { name: 'Last 30 days' })
      ).toHaveAttribute('aria-pressed', 'false')
      expect(
        within(dialog).getByRole('button', { name: 'Month to date' })
      ).toHaveAttribute('aria-pressed', 'true')
      expect(
        within(dialog).getByRole('button', { name: 'Custom range' })
      ).toHaveAttribute('aria-pressed', 'false')
    })

    it('focuses the chosen preset on open', async () => {
      render(
        <DateRangePicker
          aria-label='Period'
          today={TODAY}
          defaultValue='yesterday'
        />
      )
      const dialog = await open()
      await vi.waitFor(() =>
        expect(
          within(dialog).getByRole('button', { name: 'Yesterday' })
        ).toHaveFocus()
      )
    })

    it('emits a preset as given, so it stays relative, and closes', async () => {
      const onValueChange = vi.fn()
      render(
        <DateRangePicker
          aria-label='Period'
          today={TODAY}
          onValueChange={onValueChange}
        />
      )
      const dialog = await open()
      await userEvent.click(
        within(dialog).getByRole('button', { name: 'Last 30 days' })
      )
      expect(onValueChange).toHaveBeenCalledWith({
        direction: 'past',
        amount: 30,
        unit: 'day'
      })
      await vi.waitFor(() =>
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      )
      expect(trigger()).toHaveTextContent('Last 30 days')
      expect(trigger()).toHaveFocus()
    })

    it('takes an app’s presets, labelled and grouped', async () => {
      const onValueChange = vi.fn()
      render(
        <DateRangePicker
          aria-label='Period'
          today={TODAY}
          onValueChange={onValueChange}
          presets={[
            { value: { direction: 'next', amount: 30, unit: 'day' } },
            {
              label: 'On-sale week',
              value: { start: '2026-11-02', end: '2026-11-08' },
              group: 'Xylophone Tide Festival'
            }
          ]}
        />
      )
      const dialog = await open()
      expect(
        within(dialog).queryByRole('button', { name: 'Today' })
      ).not.toBeInTheDocument()
      const festival = within(dialog).getByRole('group', {
        name: 'Xylophone Tide Festival'
      })
      await userEvent.click(
        within(festival).getByRole('button', { name: 'On-sale week' })
      )
      expect(onValueChange).toHaveBeenCalledWith({
        start: '2026-11-02',
        end: '2026-11-08'
      })
    })

    it('hides the list when given none', async () => {
      render(<DateRangePicker aria-label='Period' today={TODAY} presets={[]} />)
      const dialog = await open()
      expect(
        within(dialog).queryByRole('button', { name: 'Custom range' })
      ).not.toBeInTheDocument()
    })

    it('marks custom range for dates no preset names and moves to the start field', async () => {
      render(
        <DateRangePicker
          aria-label='Period'
          today={TODAY}
          defaultValue={{ start: '2026-10-02', end: '2026-10-05' }}
        />
      )
      const dialog = await open()
      const custom = within(dialog).getByRole('button', {
        name: 'Custom range'
      })
      expect(custom).toHaveAttribute('aria-pressed', 'true')
      await userEvent.click(custom)
      expect(
        within(dialog).getByRole('combobox', { name: 'Start' })
      ).toHaveFocus()
    })
  })

  describe('calendar', () => {
    it('shows the range’s dates in the calendar and fields', async () => {
      render(
        <DateRangePicker
          aria-label='Period'
          today={TODAY}
          defaultValue='last-week'
          numberOfMonths={2}
        />
      )
      const dialog = await open()
      expect(day('2026-09-28')).toHaveAttribute('data-range-start')
      expect(day('2026-10-04')).toHaveAttribute('data-range-end')
      expect(
        within(dialog).getByRole('combobox', { name: 'Start' })
      ).toHaveValue('28 Sept 2026')
      expect(within(dialog).getByRole('combobox', { name: 'End' })).toHaveValue(
        '4 Oct 2026'
      )
    })

    it('emits the days chosen as absolute dates and closes', async () => {
      const onValueChange = vi.fn()
      render(
        <DateRangePicker
          aria-label='Period'
          today={TODAY}
          defaultValue='today'
          onValueChange={onValueChange}
        />
      )
      await open()
      await userEvent.click(day('2026-10-12'))
      expect(onValueChange).not.toHaveBeenCalled()
      await userEvent.click(day('2026-10-16'))
      expect(onValueChange).toHaveBeenCalledWith({
        start: '2026-10-12',
        end: '2026-10-16'
      })
      await vi.waitFor(() =>
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      )
      expect(trigger()).toHaveTextContent('12 to 16 Oct 2026')
    })
  })

  describe('typed dates', () => {
    it('suggests no ranges in the Start field', async () => {
      render(<DateRangePicker aria-label='Period' today={TODAY} />)
      const dialog = await open()
      const start = within(dialog).getByRole('combobox', { name: 'Start' })
      await userEvent.type(start, 'next we')
      const nextWed = await screen.findByRole('option', { name: /^Next Wed/ })
      await userEvent.type(start, 'ek')
      await vi.waitFor(() => expect(nextWed).not.toBeInTheDocument())
      expect(screen.queryByRole('option', { name: /^Next week/ })).toBeNull()
    })

    it('suggests no End before the start', async () => {
      render(
        <DateRangePicker
          aria-label='Period'
          today={TODAY}
          defaultValue={{ start: '2026-10-12', end: '2026-10-13' }}
        />
      )
      const dialog = await open()
      const end = within(dialog).getByRole('combobox', { name: 'End' })
      await userEvent.clear(end)
      await userEvent.type(end, 't')
      const tuesday = await screen.findByRole('option', { name: /^Tue/ })
      await userEvent.type(end, 'om')
      await vi.waitFor(() => expect(tuesday).not.toBeInTheDocument())
      expect(screen.queryByRole('option', { name: /^Tomorrow/ })).toBeNull()
      await userEvent.clear(end)
      await userEvent.type(end, 'next tue')
      await screen.findByRole('option', { name: /^Next Tue/ })
    })

    it('reads typed start and end dates and stays open', async () => {
      const onValueChange = vi.fn()
      render(
        <DateRangePicker
          aria-label='Period'
          today={TODAY}
          onValueChange={onValueChange}
        />
      )
      const dialog = await open()
      await userEvent.type(
        within(dialog).getByRole('combobox', { name: 'Start' }),
        '1 oct{Enter}'
      )
      expect(onValueChange).not.toHaveBeenCalled()
      await userEvent.type(
        within(dialog).getByRole('combobox', { name: 'End' }),
        'next fri{Enter}'
      )
      expect(onValueChange).toHaveBeenCalledWith({
        start: '2026-10-01',
        end: '2026-10-16'
      })
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('refuses an end before the start', async () => {
      const onValueChange = vi.fn()
      render(
        <DateRangePicker
          aria-label='Period'
          today={TODAY}
          defaultValue={{ start: '2026-10-10', end: '2026-10-12' }}
          onValueChange={onValueChange}
        />
      )
      const dialog = await open()
      const end = within(dialog).getByRole('combobox', { name: 'End' })
      await userEvent.clear(end)
      await userEvent.type(end, '2 oct{Enter}')
      expect(onValueChange).not.toHaveBeenCalled()
      expect(end).toHaveAttribute('aria-invalid', 'true')
      expect(end).toHaveAccessibleDescription('Ends before it starts')
    })

    it('says why typed text isn’t a date', async () => {
      render(<DateRangePicker aria-label='Period' today={TODAY} />)
      const dialog = await open()
      const start = within(dialog).getByRole('combobox', { name: 'Start' })
      await userEvent.type(start, 'someday{Enter}')
      expect(start).toHaveAccessibleDescription(
        'Enter a date, like 14 Mar or next Fri'
      )
    })

    it('empties the range when both dates are cleared', async () => {
      const onValueChange = vi.fn()
      render(
        <DateRangePicker
          aria-label='Period'
          today={TODAY}
          defaultValue={{ start: '2026-10-10', end: '2026-10-12' }}
          onValueChange={onValueChange}
        />
      )
      const dialog = await open()
      await userEvent.clear(
        within(dialog).getByRole('combobox', { name: 'Start' })
      )
      await userEvent.clear(
        within(dialog).getByRole('combobox', { name: 'End' })
      )
      await userEvent.tab()
      expect(onValueChange).toHaveBeenLastCalledWith(null)
    })
  })

  describe("commit='apply'", () => {
    it('holds changes until Apply', async () => {
      const onValueChange = vi.fn()
      render(
        <DateRangePicker
          aria-label='Period'
          commit='apply'
          today={TODAY}
          defaultValue='yesterday'
          onValueChange={onValueChange}
        />
      )
      const dialog = await open()
      await userEvent.click(
        within(dialog).getByRole('button', { name: 'Last 7 days' })
      )
      expect(onValueChange).not.toHaveBeenCalled()
      expect(
        within(dialog).getByRole('button', { name: 'Last 7 days' })
      ).toHaveAttribute('aria-pressed', 'true')
      await userEvent.click(
        within(dialog).getByRole('button', { name: 'Apply' })
      )
      expect(onValueChange).toHaveBeenCalledWith({
        direction: 'past',
        amount: 7,
        unit: 'day'
      })
      await vi.waitFor(() =>
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      )
    })

    it('keeps Apply off for an empty range when required', async () => {
      render(
        <DateRangePicker
          aria-label='Period'
          commit='apply'
          required
          today={TODAY}
          defaultValue={{ start: '2026-10-10', end: '2026-10-12' }}
        />
      )
      const dialog = await open()
      await userEvent.clear(
        within(dialog).getByRole('combobox', { name: 'Start' })
      )
      await userEvent.clear(
        within(dialog).getByRole('combobox', { name: 'End' })
      )
      await userEvent.tab()
      expect(
        within(dialog).getByRole('button', { name: 'Apply' })
      ).toBeDisabled()
    })

    it('drops changes on Cancel and on Escape', async () => {
      const onValueChange = vi.fn()
      render(
        <DateRangePicker
          aria-label='Period'
          commit='apply'
          today={TODAY}
          defaultValue='yesterday'
          onValueChange={onValueChange}
        />
      )
      let dialog = await open()
      await userEvent.click(
        within(dialog).getByRole('button', { name: 'Last 7 days' })
      )
      await userEvent.click(
        within(dialog).getByRole('button', { name: 'Cancel' })
      )
      await vi.waitFor(() =>
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      )
      dialog = await open()
      expect(
        within(dialog).getByRole('button', { name: 'Yesterday' })
      ).toHaveAttribute('aria-pressed', 'true')
      await userEvent.click(day('2026-10-12'))
      await userEvent.click(day('2026-10-14'))
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      await userEvent.keyboard('{Escape}')
      await vi.waitFor(() =>
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      )
      expect(onValueChange).not.toHaveBeenCalled()
      expect(trigger()).toHaveTextContent('Yesterday')
    })

    it('turns Apply off until the range is whole', async () => {
      render(
        <DateRangePicker aria-label='Period' commit='apply' today={TODAY} />
      )
      const dialog = await open()
      const apply = within(dialog).getByRole('button', { name: 'Apply' })
      await userEvent.click(day('2026-10-12'))
      expect(apply).toBeDisabled()
      await userEvent.click(day('2026-10-13'))
      expect(apply).toBeEnabled()
    })
  })

  describe("granularity='minute'", () => {
    it('adds optional times, read on the zone’s clock', async () => {
      const onValueChange = vi.fn()
      render(
        <DateRangePicker
          aria-label='Presale'
          granularity='minute'
          timeZone='Australia/Sydney'
          today={TODAY}
          presets={[]}
          defaultValue={{ start: '2026-11-02', end: '2026-11-04' }}
          onValueChange={onValueChange}
        />
      )
      const dialog = await open()
      await userEvent.type(
        within(dialog).getByRole('textbox', { name: 'Start time' }),
        '9am{Enter}'
      )
      expect(onValueChange).toHaveBeenCalledWith({
        start: '2026-11-02T09:00:00+11:00',
        end: '2026-11-04'
      })
    })

    it('shows a date-time value on the zone’s clock', async () => {
      render(
        <DateRangePicker
          aria-label='Presale'
          granularity='minute'
          timeZone='Australia/Perth'
          today={TODAY}
          presets={[]}
          defaultValue={{
            start: '2026-11-02T09:00:00+11:00',
            end: '2026-11-04'
          }}
        />
      )
      const dialog = await open()
      expect(
        within(dialog).getByRole('textbox', { name: 'Start time' })
      ).toHaveValue('6:00am')
    })
  })

  describe('states', () => {
    it('is turned off by disabled, here or on Field', () => {
      render(
        <Field disabled>
          <Field.Label>Period</Field.Label>
          <DateRangePicker today={TODAY} />
        </Field>
      )
      expect(trigger()).toBeDisabled()
    })

    it('shows a read-only range without opening', async () => {
      render(
        <DateRangePicker
          aria-label='Period'
          today={TODAY}
          defaultValue='yesterday'
          readOnly
        />
      )
      expect(trigger()).toHaveAttribute('aria-disabled', 'true')
      expect(trigger()).toHaveAttribute('data-readonly')
      await userEvent.click(trigger())
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('disables matched days and refuses them typed', async () => {
      render(
        <DateRangePicker
          aria-label='Period'
          today={TODAY}
          disabled={{ before: '2026-10-01' }}
        />
      )
      const dialog = await open()
      expect(day('2026-10-01')).not.toHaveAttribute('data-disabled')
      expect(day('2026-09-30') ?? null).toBeNull()
      await userEvent.click(
        within(dialog).getByRole('button', { name: 'Previous month' })
      )
      expect(day('2026-09-30')).toHaveAttribute('data-disabled')
      await userEvent.type(
        within(dialog).getByRole('combobox', { name: 'Start' }),
        '30 sep{Enter}'
      )
      expect(
        within(dialog).getByRole('combobox', { name: 'Start' })
      ).toHaveAccessibleDescription('30 Sept 2026 isn’t available')
    })
  })

  describe('review fixes', () => {
    it('drops an edit when it closes by a click outside', async () => {
      function Outside() {
        const [value, setValue] = useState<DateRangeValue | null>({
          start: '2026-10-10',
          end: '2026-10-12'
        })
        return (
          <>
            <DateRangePicker
              aria-label='Period'
              commit='apply'
              today={TODAY}
              value={value}
              onValueChange={setValue}
            />
            <button type='button' onClick={() => setValue('yesterday')}>
              Outside
            </button>
          </>
        )
      }
      render(<Outside />)
      let dialog = await open()
      const start = within(dialog).getByRole('combobox', { name: 'Start' })
      await userEvent.clear(start)
      await userEvent.type(start, '1 oct')
      // The open suggestions hide the rest of the page from the tree.
      await userEvent.click(
        screen.getByRole('button', { name: 'Outside', hidden: true })
      )
      await vi.waitFor(() =>
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      )
      dialog = await open()
      expect(
        within(dialog).getByRole('button', { name: 'Yesterday' })
      ).toHaveAttribute('aria-pressed', 'true')
    })

    it('emits nothing while typed text names no date', async () => {
      const onValueChange = vi.fn()
      render(
        <DateRangePicker
          aria-label='Period'
          today={TODAY}
          defaultValue={{ start: '2026-10-10', end: '2026-10-12' }}
          onValueChange={onValueChange}
        />
      )
      const dialog = await open()
      const start = within(dialog).getByRole('combobox', { name: 'Start' })
      const end = within(dialog).getByRole('combobox', { name: 'End' })
      await userEvent.clear(start)
      await userEvent.type(start, 'zzz{Enter}')
      await userEvent.clear(end)
      await userEvent.type(end, 'qqq{Enter}')
      expect(onValueChange).not.toHaveBeenCalled()
      expect(trigger()).toHaveTextContent('10 to 12 Oct 2026')
    })

    it('turns Apply off while a time names nothing', async () => {
      render(
        <DateRangePicker
          aria-label='Presale'
          commit='apply'
          granularity='minute'
          timeZone='Australia/Sydney'
          today={TODAY}
          presets={[]}
          defaultValue={{
            start: '2026-11-02T09:00:00+11:00',
            end: '2026-11-04T17:00:00+11:00'
          }}
        />
      )
      const dialog = await open()
      const endTime = within(dialog).getByRole('textbox', { name: 'End time' })
      await userEvent.clear(endTime)
      await userEvent.type(endTime, '99xx{Enter}')
      expect(
        within(dialog).getByRole('button', { name: 'Apply' })
      ).toBeDisabled()
    })

    it('turns the calendar to a preset or typed date', async () => {
      render(
        <DateRangePicker
          aria-label='Period'
          commit='apply'
          today={TODAY}
          numberOfMonths={1}
          defaultValue='yesterday'
        />
      )
      const dialog = await open()
      await userEvent.click(
        within(dialog).getByRole('button', { name: 'Last quarter' })
      )
      expect(day('2026-07-01')).toHaveAttribute('data-range-start')
      const end = within(dialog).getByRole('combobox', { name: 'End' })
      await userEvent.clear(end)
      await userEvent.type(end, '5 jan 2027{Enter}')
      expect(day('2027-01-05')).toHaveAttribute('data-range-end')
    })

    it('keeps a typed end when the start is pressed in the calendar', async () => {
      const onValueChange = vi.fn()
      render(
        <DateRangePicker
          aria-label='Period'
          today={TODAY}
          onValueChange={onValueChange}
        />
      )
      const dialog = await open()
      await userEvent.type(
        within(dialog).getByRole('combobox', { name: 'End' }),
        '20 oct{Enter}'
      )
      await userEvent.click(day('2026-10-12'))
      expect(onValueChange).toHaveBeenCalledWith({
        start: '2026-10-12',
        end: '2026-10-20'
      })
    })

    it('shows where a time skipped by daylight saving lands', async () => {
      render(
        <DateRangePicker
          aria-label='Presale'
          granularity='minute'
          timeZone='Australia/Sydney'
          today={TODAY}
          presets={[]}
          defaultValue={{ start: '2026-10-04', end: '2026-10-05' }}
        />
      )
      const dialog = await open()
      const time = within(dialog).getByRole('textbox', { name: 'Start time' })
      await userEvent.type(time, '2:30am{Enter}')
      expect(time).toHaveValue('3:30am')
    })

    it('closes on Escape with only an end typed, keeping the value', async () => {
      const onValueChange = vi.fn()
      render(
        <DateRangePicker
          aria-label='Period'
          today={TODAY}
          numberOfMonths={1}
          defaultValue={{ start: '2026-10-10', end: '2026-10-12' }}
          onValueChange={onValueChange}
        />
      )
      const dialog = await open()
      await userEvent.clear(
        within(dialog).getByRole('combobox', { name: 'Start' })
      )
      await userEvent.keyboard('{Enter}')
      day('2026-10-12').focus()
      await userEvent.keyboard('{Escape}')
      await vi.waitFor(() =>
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      )
      expect(onValueChange).not.toHaveBeenCalled()
    })

    it('starts a new range from a later day pressed after only an end', async () => {
      const onValueChange = vi.fn()
      render(
        <DateRangePicker
          aria-label='Period'
          today={TODAY}
          onValueChange={onValueChange}
        />
      )
      const dialog = await open()
      await userEvent.type(
        within(dialog).getByRole('combobox', { name: 'End' }),
        '20 oct{Enter}'
      )
      await userEvent.click(day('2026-10-25'))
      expect(onValueChange).not.toHaveBeenCalled()
      expect(
        within(dialog).getByRole('combobox', { name: 'Start' })
      ).toHaveValue('25 Oct 2026')
    })

    it('refuses typed dates longer than max', async () => {
      const onValueChange = vi.fn()
      render(
        <DateRangePicker
          aria-label='Period'
          today={TODAY}
          max={7}
          onValueChange={onValueChange}
        />
      )
      const dialog = await open()
      await userEvent.type(
        within(dialog).getByRole('combobox', { name: 'Start' }),
        '1 oct{Enter}'
      )
      const end = within(dialog).getByRole('combobox', { name: 'End' })
      await userEvent.type(end, '30 oct{Enter}')
      expect(onValueChange).not.toHaveBeenCalled()
      expect(end).toHaveAccessibleDescription('Spans more than 7 days')
    })

    it('refuses typed dates shorter than min', async () => {
      render(<DateRangePicker aria-label='Period' today={TODAY} min={3} />)
      const dialog = await open()
      await userEvent.type(
        within(dialog).getByRole('combobox', { name: 'Start' }),
        '1 oct{Enter}'
      )
      const end = within(dialog).getByRole('combobox', { name: 'End' })
      await userEvent.type(end, '2 oct{Enter}')
      expect(end).toHaveAccessibleDescription('Spans fewer than 3 days')
    })

    it('starts each opening from the value when open is controlled', async () => {
      const picker = (isOpen: boolean) => (
        <DateRangePicker
          aria-label='Period'
          commit='apply'
          today={TODAY}
          defaultValue={{ start: '2026-10-10', end: '2026-10-12' }}
          open={isOpen}
        />
      )
      const { rerender } = render(picker(true))
      let dialog = await screen.findByRole('dialog')
      const start = within(dialog).getByRole('combobox', { name: 'Start' })
      await userEvent.clear(start)
      await userEvent.type(start, '1 oct{Enter}')
      rerender(picker(false))
      await vi.waitFor(() =>
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      )
      rerender(picker(true))
      dialog = await screen.findByRole('dialog')
      expect(
        within(dialog).getByRole('combobox', { name: 'Start' })
      ).toHaveValue('10 Oct 2026')
    })

    it('leaves the calendar where it is for a typed date already in view', async () => {
      render(
        <DateRangePicker
          aria-label='Period'
          today={TODAY}
          numberOfMonths={2}
          defaultValue={{ start: '2026-10-10', end: '2026-10-12' }}
        />
      )
      const dialog = await open()
      const end = within(dialog).getByRole('combobox', { name: 'End' })
      await userEvent.clear(end)
      await userEvent.type(end, '20 oct{Enter}')
      expect(day('2026-11-01')).not.toBeNull()
      expect(day('2026-10-20')).toHaveAttribute('data-range-end')
    })

    it('keeps the calendar still after a range is pressed with times', async () => {
      render(
        <DateRangePicker
          aria-label='Presale'
          granularity='minute'
          numberOfMonths={2}
          today={TODAY}
          presets={[]}
        />
      )
      await open()
      await userEvent.click(day('2026-11-03'))
      await userEvent.click(day('2026-11-08'))
      expect(day('2026-10-07')).not.toBeNull()
    })

    it('marks a typed end with no start in the calendar', async () => {
      render(
        <DateRangePicker aria-label='Period' today={TODAY} numberOfMonths={1} />
      )
      const dialog = await open()
      await userEvent.type(
        within(dialog).getByRole('combobox', { name: 'End' }),
        '20 oct{Enter}'
      )
      expect(day('2026-10-20')).toHaveAttribute('data-selected')
    })

    it('keeps the value when Escape drops a half-pressed range', async () => {
      const onValueChange = vi.fn()
      render(
        <DateRangePicker
          aria-label='Period'
          today={TODAY}
          numberOfMonths={1}
          defaultValue={{ start: '2026-10-10', end: '2026-10-12' }}
          onValueChange={onValueChange}
        />
      )
      await open()
      await userEvent.click(day('2026-10-15'))
      await userEvent.keyboard('{Escape}')
      expect(onValueChange).not.toHaveBeenCalled()
    })

    it('says day for a limit of one', async () => {
      render(<DateRangePicker aria-label='Period' today={TODAY} max={1} />)
      const dialog = await open()
      await userEvent.type(
        within(dialog).getByRole('combobox', { name: 'Start' }),
        '1 oct{Enter}'
      )
      const end = within(dialog).getByRole('combobox', { name: 'End' })
      await userEvent.type(end, '3 oct{Enter}')
      expect(end).toHaveAccessibleDescription('Spans more than 1 day')
    })

    it('drops its edit when the parent changes the value while open', async () => {
      const picker = (value: DateRangeValue) => (
        <DateRangePicker
          aria-label='Period'
          commit='apply'
          today={TODAY}
          value={value}
          defaultOpen
        />
      )
      const { rerender } = render(picker('yesterday'))
      const dialog = await screen.findByRole('dialog')
      await userEvent.click(
        within(dialog).getByRole('button', { name: 'Last 7 days' })
      )
      rerender(picker('last-month'))
      expect(
        within(dialog).getByRole('button', { name: 'Last month' })
      ).toHaveAttribute('aria-pressed', 'true')
    })

    it('keeps its edit when the parent takes what it emitted', async () => {
      function Controlled() {
        const [value, setValue] = useState<DateRangeValue | null>('yesterday')
        return (
          <DateRangePicker
            aria-label='Period'
            today={TODAY}
            value={value}
            onValueChange={setValue}
          />
        )
      }
      render(<Controlled />)
      const dialog = await open()
      const start = within(dialog).getByRole('combobox', { name: 'Start' })
      await userEvent.clear(start)
      await userEvent.type(start, '1 oct{Enter}')
      expect(within(dialog).getByRole('combobox', { name: 'End' })).toHaveValue(
        '6 Oct 2026'
      )
      expect(start).toHaveValue('1 Oct 2026')
    })

    it('reads a month count below one as one', async () => {
      render(
        <DateRangePicker aria-label='Period' today={TODAY} numberOfMonths={0} />
      )
      const dialog = await open()
      await userEvent.type(
        within(dialog).getByRole('combobox', { name: 'End' }),
        '5 dec{Enter}'
      )
      expect(day('2026-12-05')).toHaveAttribute('data-selected')
    })

    // ARIA doesn't allow aria-required on a button.
    it('says it is required in its description, where ARIA allows it', () => {
      render(
        <Field required>
          <Field.Label>Period</Field.Label>
          <DateRangePicker today={TODAY} />
        </Field>
      )
      expect(trigger()).not.toHaveAttribute('aria-required')
      expect(trigger()).toHaveAccessibleDescription('Required')
    })
  })

  it('follows a controlled value', async () => {
    function Controlled() {
      const [value, setValue] = useState<DateRangeValue | null>('today')
      return (
        <>
          <DateRangePicker
            aria-label='Period'
            today={TODAY}
            value={value}
            onValueChange={setValue}
          />
          <button type='button' onClick={() => setValue('last-month')}>
            Reset
          </button>
        </>
      )
    }
    render(<Controlled />)
    expect(trigger()).toHaveTextContent('Today')
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(trigger()).toHaveTextContent('Last month')
    const dialog = await open()
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Yesterday' })
    )
    expect(trigger()).toHaveTextContent('Yesterday')
  })
})

describe('DateRangePicker on a phone', () => {
  it('keeps Clear and Apply in the drawer footer, out of the scroll', async () => {
    onPhone()
    const onValueChange = vi.fn()
    render(
      <Field>
        <Field.Label>Sales period</Field.Label>
        <DateRangePicker
          today={TODAY}
          commit='apply'
          defaultValue='yesterday'
          onValueChange={onValueChange}
        />
      </Field>
    )
    const dialog = await open()
    expect(dialog).toHaveAccessibleName('Choose dates, Sales period')
    expect(within(dialog).getAllByRole('heading')[0]).toHaveTextContent(
      'Sales period'
    )
    const footer = dialog.querySelector<HTMLElement>(
      '[data-slot="drawer-footer"]'
    )!
    const body = dialog.querySelector<HTMLElement>('[data-slot="drawer-body"]')!
    expect(within(body).getByRole('list', { name: 'Periods' })).toBeVisible()
    expect(within(body).queryByRole('button', { name: 'Apply' })).toBeNull()
    expect(within(dialog).queryByRole('button', { name: 'Cancel' })).toBeNull()
    expect(within(footer).getByRole('button', { name: 'Clear' })).toBeVisible()
    await userEvent.click(
      within(dialog).getByRole('button', { name: /^Last week/ })
    )
    expect(onValueChange).not.toHaveBeenCalled()
    await userEvent.click(within(footer).getByRole('button', { name: 'Apply' }))
    expect(onValueChange).toHaveBeenCalledWith('last-week')
    await vi.waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
    expect(trigger()).toHaveFocus()
  })

  it('lists a fixed preset’s dates and marks it current', async () => {
    onPhone()
    render(
      <DateRangePicker
        aria-label='Period'
        today={TODAY}
        commit='apply'
        presets={FIXED_PRESETS}
        defaultValue={{ start: '2026-09-06', end: '2026-10-05' }}
      />
    )
    const dialog = await open()
    const list = within(dialog).getByRole('list', { name: 'Periods' })
    const row = within(list).getByRole('button', { name: /^Last 30 days/ })
    expect(row).toHaveTextContent('6 Sept to 5 Oct 2026')
    expect(row).toHaveAttribute('aria-current', 'true')
    expect(
      within(list).getByRole('button', { name: /^Last financial year/ })
    ).toHaveTextContent('1 Jul 2025 to 30 Jun 2026')
  })

  it('clears the dates, and Apply sends null', async () => {
    onPhone()
    const onValueChange = vi.fn()
    render(
      <DateRangePicker
        aria-label='Period'
        today={TODAY}
        commit='apply'
        defaultValue='yesterday'
        onValueChange={onValueChange}
      />
    )
    const dialog = await open()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Clear' }))
    expect(within(dialog).getByRole('button', { name: 'Clear' })).toBeDisabled()
    expect(dialog).toHaveAccessibleDescription('No dates chosen')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Apply' }))
    expect(onValueChange).toHaveBeenCalledWith(null)
  })

  it('keeps Apply off after Clear when a range is required', async () => {
    onPhone()
    render(
      <DateRangePicker
        aria-label='Period'
        today={TODAY}
        commit='apply'
        required
        defaultValue='yesterday'
      />
    )
    const dialog = await open()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Clear' }))
    expect(within(dialog).getByRole('button', { name: 'Apply' })).toBeDisabled()
  })

  it('reopens on the view the value calls for, whatever was left', async () => {
    onPhone()
    render(
      <DateRangePicker aria-label='Period' today={TODAY} defaultValue='today' />
    )
    let dialog = await open()
    await userEvent.click(within(dialog).getByRole('tab', { name: 'Calendar' }))
    await userEvent.keyboard('{Escape}')
    await vi.waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
    dialog = await open()
    expect(
      within(dialog).getByRole('tab', { name: 'Periods' })
    ).toHaveAttribute('aria-selected', 'true')
  })
})

// Several drawer steps each, which a busy CI runner takes past the default.
describe('DateRangePicker aiming a tap on a phone', { timeout: 15_000 }, () => {
  const summary = (dialog: HTMLElement) =>
    dialog.querySelector('[data-slot="date-range-picker-summary"]')!

  it('moves only the start once Start is tapped, with no end yet', async () => {
    onPhone()
    render(
      <DateRangePicker
        aria-label='Period'
        today={TODAY}
        commit='apply'
        defaultValue={null}
      />
    )
    const dialog = await open()
    await userEvent.click(day('2026-10-10'))
    await userEvent.click(
      within(dialog).getByRole('combobox', { name: 'Start' })
    )
    await userEvent.click(day('2026-10-15'))
    expect(summary(dialog)).toHaveTextContent('From 15 Oct 2026')
  })

  it('moves the start anywhere once Start is tapped, whatever max says', async () => {
    onPhone()
    render(
      <DateRangePicker
        aria-label='Period'
        today={TODAY}
        commit='apply'
        max={14}
        defaultValue={null}
      />
    )
    const dialog = await open()
    await userEvent.click(day('2026-10-01'))
    await userEvent.click(
      within(dialog).getByRole('combobox', { name: 'Start' })
    )
    await userEvent.click(day('2026-10-28'))
    expect(summary(dialog)).toHaveTextContent('From 28 Oct 2026')
  })

  it('moves only the end when aimed, and says why max refuses it', async () => {
    onPhone()
    render(
      <DateRangePicker
        aria-label='Period'
        today={TODAY}
        commit='apply'
        max={7}
        defaultValue={{ start: '2026-10-05', end: '2026-10-09' }}
      />
    )
    const dialog = await open()
    const end = within(dialog).getByRole('combobox', { name: 'End' })
    await userEvent.click(end)
    await userEvent.click(day('2026-10-20'))
    expect(within(dialog).getByRole('combobox', { name: 'Start' })).toHaveValue(
      '5 Oct 2026'
    )
    expect(end).toHaveValue('20 Oct 2026')
    expect(dialog).toHaveTextContent('Spans more than 7 days')
    expect(within(dialog).getByRole('button', { name: 'Apply' })).toBeDisabled()
  })

  it('moves only the start when aimed after the end, and says so', async () => {
    onPhone()
    render(
      <DateRangePicker
        aria-label='Period'
        today={TODAY}
        commit='apply'
        defaultValue={{ start: '2026-10-10', end: '2026-10-12' }}
      />
    )
    const dialog = await open()
    const start = within(dialog).getByRole('combobox', { name: 'Start' })
    await userEvent.click(start)
    await userEvent.click(day('2026-10-20'))
    expect(start).toHaveValue('20 Oct 2026')
    expect(within(dialog).getByRole('combobox', { name: 'End' })).toHaveValue(
      '12 Oct 2026'
    )
    expect(summary(dialog)).toHaveTextContent('Ends before it starts')
  })

  it('moves only the end when aimed before the start, and says so', async () => {
    onPhone()
    render(
      <DateRangePicker
        aria-label='Period'
        today={TODAY}
        commit='apply'
        defaultValue={{ start: '2026-10-10', end: '2026-10-12' }}
      />
    )
    const dialog = await open()
    const end = within(dialog).getByRole('combobox', { name: 'End' })
    await userEvent.click(end)
    await userEvent.click(day('2026-10-05'))
    expect(within(dialog).getByRole('combobox', { name: 'Start' })).toHaveValue(
      '10 Oct 2026'
    )
    expect(end).toHaveValue('5 Oct 2026')
    expect(summary(dialog)).toHaveTextContent('Ends before it starts')
  })

  it('says when the end comes before the start', async () => {
    onPhone()
    render(
      <DateRangePicker
        aria-label='Period'
        today={TODAY}
        commit='apply'
        defaultValue={{ start: '2026-10-10', end: '2026-10-12' }}
      />
    )
    const dialog = await open()
    const end = within(dialog).getByRole('combobox', { name: 'End' })
    await userEvent.clear(end)
    await userEvent.type(end, '5 oct 2026{Enter}')
    expect(summary(dialog)).toHaveTextContent('Ends before it starts')
  })

  it('lets Clear drop text that names no date', async () => {
    onPhone()
    render(
      <DateRangePicker
        aria-label='Period'
        today={TODAY}
        commit='apply'
        defaultValue={null}
      />
    )
    const dialog = await open()
    const start = within(dialog).getByRole('combobox', { name: 'Start' })
    await userEvent.type(start, 'zzz{Enter}')
    const clear = within(dialog).getByRole('button', { name: 'Clear' })
    expect(clear).toBeEnabled()
    await userEvent.click(clear)
    const fresh = within(dialog).getByRole('combobox', { name: 'Start' })
    expect(fresh).toHaveValue('')
    expect(fresh).not.toHaveAttribute('aria-invalid')
    expect(clear).toBeDisabled()
  })

  it('turns the periods off when read-only and opened anyway', async () => {
    onPhone()
    render(
      <DateRangePicker
        aria-label='Period'
        today={TODAY}
        readOnly
        open
        defaultValue='today'
      />
    )
    const dialog = await screen.findByRole('dialog')
    expect(
      within(dialog).getByRole('button', { name: /^Yesterday/ })
    ).toBeDisabled()
  })

  it('changes nothing when read-only and opened anyway', async () => {
    onPhone()
    const onValueChange = vi.fn()
    render(
      <DateRangePicker
        aria-label='Period'
        today={TODAY}
        readOnly
        open
        defaultValue='today'
        onValueChange={onValueChange}
      />
    )
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(
      within(dialog).getByRole('button', { name: /^Yesterday/ })
    )
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('keeps Clear and Apply off when disabled and opened anyway', async () => {
    onPhone()
    render(
      <DateRangePicker
        aria-label='Period'
        today={TODAY}
        commit='apply'
        disabled
        open
        defaultValue='today'
      />
    )
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('button', { name: 'Clear' })).toBeDisabled()
    expect(within(dialog).getByRole('button', { name: 'Apply' })).toBeDisabled()
  })
})

describe('DateRangePicker across the phone breakpoint', () => {
  it('keeps its button, and focus, as the screen narrows', () => {
    const screenSize = onPhone(false)
    render(<DateRangePicker aria-label='Period' today={TODAY} />)
    const button = trigger()
    button.focus()
    act(() => screenSize.set(true))
    expect(trigger()).toBe(button)
    expect(button).toHaveFocus()
  })

  it('marks its button expanded while the drawer is open', async () => {
    onPhone()
    render(<DateRangePicker aria-label='Period' today={TODAY} />)
    await open()
    const button = document.querySelector(
      '[data-slot="date-range-picker-trigger"]'
    )!
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(button).toHaveAttribute('data-popup-open')
  })
})
