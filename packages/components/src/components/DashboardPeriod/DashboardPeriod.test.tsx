import { StrictMode, useState } from 'react'

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { DashboardPeriod, type DashboardPeriodValue } from '.'
import { onPhone } from '../../pickers/testUtils'
import type { DateRangePreset } from '../DateRangePicker/range'

// Wed 7 Oct 2026.
const TODAY = '2026-10-07'
const THIS_MONTH: DashboardPeriodValue = {
  range: 'this-month',
  compare: 'previous-period'
}

const picker = () =>
  screen.getByRole('button', { name: /^Choose dates, Period/ })
async function openPicker() {
  await userEvent.click(picker())
  return screen.findByRole('dialog')
}
const compareSwitch = (dialog: HTMLElement) =>
  within(dialog).getByRole('switch', { name: 'Compare' })
const compareDates = (dialog: HTMLElement) =>
  dialog.querySelector('[data-slot="dashboard-period-compare-dates"]')
const apply = (dialog: HTMLElement) =>
  userEvent.click(within(dialog).getByRole('button', { name: 'Apply' }))

function Controlled({
  initial = THIS_MONTH,
  onValueChange
}: {
  initial?: DashboardPeriodValue
  onValueChange?: (value: DashboardPeriodValue) => void
}) {
  const [value, setValue] = useState(initial)
  return (
    <DashboardPeriod
      today={TODAY}
      value={value}
      onValueChange={(next) => {
        setValue(next)
        onValueChange?.(next)
      }}
    />
  )
}

describe('DashboardPeriod', () => {
  it.each([
    [undefined, 'emphasis-normal'],
    ['normal', 'emphasis-normal'],
    ['subtle', 'bg-subtle'],
    ['subtler', 'emphasis-subtler']
  ] as const)('styles %s triggers with %s', (emphasis, className) => {
    render(
      <DashboardPeriod today={TODAY} value={THIS_MONTH} emphasis={emphasis} />
    )
    expect(picker()).toHaveClass(className)
    expect(picker()).not.toHaveClass('emphasis-raised')
  })

  it('shows the period and its comparison on one button, in a named group', () => {
    render(<DashboardPeriod today={TODAY} value={THIS_MONTH} />)
    const group = screen.getByRole('group', { name: 'Dashboard period' })
    expect(within(group).getAllByRole('button')).toHaveLength(1)
    expect(picker()).toHaveAccessibleName(
      'Choose dates, Period (This month, 1 to 31 Oct 2026, vs 1 to 30 Sept 2026)'
    )
    expect(picker()).toHaveTextContent('vs 1 to 30 Sept 2026')
  })

  it('shows no comparison on the button without one', () => {
    render(<DashboardPeriod today={TODAY} value={{ range: 'this-month' }} />)
    expect(picker()).toHaveAccessibleName(
      'Choose dates, Period (This month, 1 to 31 Oct 2026)'
    )
  })

  it('shows the comparison and the dates it covers in the picker', async () => {
    render(<DashboardPeriod today={TODAY} value={THIS_MONTH} />)
    const dialog = await openPicker()
    expect(compareSwitch(dialog)).toBeChecked()
    const choices = within(dialog).getByRole('group', { name: 'Compare with' })
    expect(
      within(choices).getByRole('button', { name: 'Previous period' })
    ).toHaveAttribute('aria-pressed', 'true')
    expect(compareDates(dialog)).toHaveTextContent('1 to 30 Sept 2026')
    await userEvent.click(
      within(choices).getByRole('button', { name: 'Previous year' })
    )
    expect(compareDates(dialog)).toHaveTextContent('1 to 31 Oct 2025')
  })

  it('lists the dates the data reaches and weekday-aligned years', async () => {
    render(
      <DashboardPeriod
        today={TODAY}
        value={THIS_MONTH}
        dataEnd={TODAY}
        alignWeekday
      />
    )
    const dialog = await openPicker()
    expect(compareDates(dialog)).toHaveTextContent('1 to 7 Sept 2026')
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Previous year' })
    )
    // Thu 1 to Wed 7 Oct 2026 against Thu 2 to Wed 8 Oct 2025.
    expect(compareDates(dialog)).toHaveTextContent('2 to 8 Oct 2025')
  })

  it('says when the data holds too little to compare', async () => {
    render(
      <DashboardPeriod
        today={TODAY}
        value={{ range: 'this-month', compare: 'previous-year' }}
        dataStart='2026-01-01'
      />
    )
    const dialog = await openPicker()
    expect(compareDates(dialog)?.textContent).toMatch(
      /^(Not enough history|Nothing to compare)$/
    )
  })

  it('follows the period being edited', async () => {
    render(<DashboardPeriod today={TODAY} value={THIS_MONTH} />)
    const dialog = await openPicker()
    await userEvent.click(
      within(dialog).getByRole('button', { name: /^Last 30 days/ })
    )
    expect(compareDates(dialog)).toHaveTextContent('9 Aug to 7 Sept 2026')
  })

  it('offers the spec’s dashboard presets by default', async () => {
    render(<DashboardPeriod today={TODAY} value={THIS_MONTH} />)
    const dialog = await openPicker()
    for (const name of [
      /^Next 30 days/,
      /^Next 90 days/,
      /^Last 30 days/,
      /^Last 12 months/,
      /^This financial year/
    ])
      expect(within(dialog).getByRole('button', { name })).toBeInTheDocument()
  })

  it('applies a comparison chosen with the same range', async () => {
    const onValueChange = vi.fn()
    render(<Controlled onValueChange={onValueChange} />)
    const dialog = await openPicker()
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Previous year' })
    )
    expect(onValueChange).not.toHaveBeenCalled()
    await apply(dialog)
    expect(onValueChange).toHaveBeenLastCalledWith({
      range: 'this-month',
      compare: 'previous-year'
    })
    expect(picker()).toHaveTextContent('vs 1 to 31 Oct 2025')
  })

  it('drops the comparison when Compare is turned off', async () => {
    const onValueChange = vi.fn()
    render(<Controlled onValueChange={onValueChange} />)
    const dialog = await openPicker()
    await userEvent.click(compareSwitch(dialog))
    expect(
      within(dialog).queryByRole('group', { name: 'Compare with' })
    ).toBeNull()
    await apply(dialog)
    expect(onValueChange).toHaveBeenLastCalledWith({ range: 'this-month' })
    expect(onValueChange.mock.lastCall![0]).not.toHaveProperty('compare')
    expect(picker()).not.toHaveTextContent('vs')
  })

  it('discards a changed comparison on Cancel', async () => {
    const onValueChange = vi.fn()
    render(<Controlled onValueChange={onValueChange} />)
    let dialog = await openPicker()
    await userEvent.click(compareSwitch(dialog))
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Cancel' })
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(onValueChange).not.toHaveBeenCalled()
    dialog = await openPicker()
    expect(compareSwitch(dialog)).toBeChecked()
  })

  it('shows custom comparison dates it is given', async () => {
    render(
      <DashboardPeriod
        today={TODAY}
        value={{
          range: 'this-month',
          compare: { start: '2026-09-01', end: '2026-09-07' }
        }}
      />
    )
    expect(picker()).toHaveTextContent('vs 1 to 7 Sept 2026')
    const dialog = await openPicker()
    expect(
      within(dialog).getByRole('button', { name: 'Custom dates' })
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('keeps the comparison when the period changes', async () => {
    const onValueChange = vi.fn()
    render(<Controlled onValueChange={onValueChange} />)
    const dialog = await openPicker()
    await userEvent.click(
      within(dialog).getByRole('button', { name: /^Last 30 days/ })
    )
    expect(onValueChange).not.toHaveBeenCalled()
    await apply(dialog)
    expect(onValueChange).toHaveBeenLastCalledWith({
      range: { direction: 'past', amount: 30, unit: 'day' },
      compare: 'previous-period'
    })
  })

  it('shows a set period without letting it change', async () => {
    render(<DashboardPeriod today={TODAY} value={THIS_MONTH} readOnly />)
    expect(picker()).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(picker())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  // The phone drawer mounts a scrolling calendar, which a busy CI runner
  // takes past the default.
  it(
    'keeps its period without calling itself required',
    { timeout: 15_000 },
    async () => {
      onPhone()
      render(<DashboardPeriod today={TODAY} value={THIS_MONTH} />)
      expect(picker()).not.toHaveAccessibleDescription(/Required/)
      const dialog = await openPicker()
      expect(within(dialog).queryByRole('button', { name: 'Clear' })).toBeNull()
    }
  )

  it('remembers no comparison from a cancelled edit', async () => {
    render(<Controlled initial={{ range: 'this-month' }} />)
    let dialog = await openPicker()
    await userEvent.click(compareSwitch(dialog))
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Previous year' })
    )
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Cancel' })
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    dialog = await openPicker()
    await userEvent.click(compareSwitch(dialog))
    expect(
      within(dialog).getByRole('button', { name: 'Previous period' })
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('follows a comparison the parent changes while the picker is open', async () => {
    const onValueChange = vi.fn()
    const { rerender } = render(
      <DashboardPeriod
        today={TODAY}
        value={THIS_MONTH}
        onValueChange={onValueChange}
      />
    )
    const dialog = await openPicker()
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Previous year' })
    )
    rerender(
      <DashboardPeriod
        today={TODAY}
        value={{ range: 'last-month' }}
        onValueChange={onValueChange}
      />
    )
    expect(compareSwitch(dialog)).not.toBeChecked()
    await apply(dialog)
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('needs a period before Apply', async () => {
    render(<Controlled />)
    const dialog = await openPicker()
    await userEvent.clear(
      within(dialog).getByRole('combobox', { name: 'Start' })
    )
    await userEvent.clear(within(dialog).getByRole('combobox', { name: 'End' }))
    await userEvent.tab()
    expect(within(dialog).getByRole('button', { name: 'Apply' })).toBeDisabled()
  })

  it('commits nothing once locked mid-edit', async () => {
    const onValueChange = vi.fn()
    const { rerender } = render(
      <DashboardPeriod
        today={TODAY}
        value={THIS_MONTH}
        onValueChange={onValueChange}
      />
    )
    const dialog = await openPicker()
    await userEvent.click(
      within(dialog).getByRole('button', { name: /^Last 30 days/ })
    )
    rerender(
      <DashboardPeriod
        today={TODAY}
        value={THIS_MONTH}
        onValueChange={onValueChange}
        disabled
      />
    )
    const button = screen.queryByRole('button', { name: 'Apply' })
    if (button) await userEvent.click(button)
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('turns off when disabled', () => {
    render(<DashboardPeriod today={TODAY} value={THIS_MONTH} disabled />)
    expect(picker()).toBeDisabled()
  })

  it('starts from a default when uncontrolled', async () => {
    const onValueChange = vi.fn()
    render(
      <DashboardPeriod
        today={TODAY}
        defaultValue={{ range: 'last-month' }}
        onValueChange={onValueChange}
      />
    )
    const dialog = await openPicker()
    expect(compareSwitch(dialog)).not.toBeChecked()
    await userEvent.click(compareSwitch(dialog))
    await apply(dialog)
    expect(onValueChange).toHaveBeenLastCalledWith({
      range: 'last-month',
      compare: 'previous-period'
    })
    expect(picker()).toHaveTextContent('vs 1 to 31 Aug 2026')
  })

  it('places the app’s own controls after its own', () => {
    render(
      <DashboardPeriod today={TODAY} value={THIS_MONTH}>
        <button type='button'>Similar venues</button>
      </DashboardPeriod>
    )
    const group = screen.getByRole('group', { name: 'Dashboard period' })
    expect(within(group).getAllByRole('button').at(-1)).toHaveTextContent(
      'Similar venues'
    )
  })

  it('renders on the server before today is known', () => {
    const html = renderToString(<DashboardPeriod value={THIS_MONTH} />)
    expect(html).toContain('vs previous period')
  })
})

// An app's own presets with fixed dates, ending yesterday.
const FIXED_PRESETS = [
  { value: { direction: 'next', amount: 30, unit: 'day' } },
  { value: { start: '2026-09-07', end: '2026-10-06' }, label: 'Last 30 days' },
  {
    value: { start: '2026-07-01', end: '2027-06-30' },
    label: 'This financial year'
  }
] satisfies DateRangePreset[]

const SIMILAR = {
  value: 'similar',
  label: 'Similar venues',
  description: 'Venues of a like size in Melbourne'
} as const
const WITH_SIMILAR = [
  'previous-period',
  'previous-year',
  'custom',
  SIMILAR
] as const

const choiceNames = (dialog: HTMLElement) =>
  within(within(dialog).getByRole('group', { name: 'Compare with' }))
    .getAllByRole('button')
    .map((button) => button.textContent)
const choice = (dialog: HTMLElement, name: string) =>
  within(within(dialog).getByRole('group', { name: 'Compare with' })).getByRole(
    'button',
    { name }
  )
const comparisonPicker = (dialog: HTMLElement) =>
  within(dialog).queryByRole('button', {
    name: /^Choose dates, Comparison dates/
  })

describe('DashboardPeriod with fixed presets', () => {
  it('names fixed dates after the preset they match', () => {
    render(
      <DashboardPeriod
        today={TODAY}
        presets={FIXED_PRESETS}
        value={{
          range: { start: '2026-09-07', end: '2026-10-06' },
          compare: 'previous-period'
        }}
      />
    )
    expect(picker()).toHaveAccessibleName(
      'Choose dates, Period (Last 30 days, 7 Sept to 6 Oct 2026, vs 8 Aug to 6 Sept 2026)'
    )
  })

  it(
    'lists a fixed preset’s dates on a phone',
    { timeout: 15_000 },
    async () => {
      onPhone()
      render(
        <DashboardPeriod
          today={TODAY}
          presets={FIXED_PRESETS}
          value={{ range: { start: '2026-07-01', end: '2027-06-30' } }}
        />
      )
      const dialog = await openPicker()
      const row = within(dialog).getByRole('button', {
        name: /^This financial year/
      })
      expect(row).toHaveTextContent('1 Jul 2026 to 30 Jun 2027')
      expect(row).toHaveAttribute('aria-current', 'true')
    }
  )
})

describe('DashboardPeriod compare options', () => {
  it('keeps today’s choices by default', async () => {
    render(<DashboardPeriod today={TODAY} value={THIS_MONTH} />)
    const dialog = await openPicker()
    expect(compareSwitch(dialog)).toBeChecked()
    expect(choiceNames(dialog)).toEqual(['Previous period', 'Previous year'])
  })

  it('shows the app’s choices in order, with no switch without none', async () => {
    render(
      <DashboardPeriod
        today={TODAY}
        value={THIS_MONTH}
        compareOptions={WITH_SIMILAR}
      />
    )
    const dialog = await openPicker()
    expect(within(dialog).queryByRole('switch')).toBeNull()
    expect(choiceNames(dialog)).toEqual([
      'Previous period',
      'Previous year',
      'Custom dates',
      'Similar venues'
    ])
  })

  it('shows a switch when the list has none', async () => {
    render(
      <DashboardPeriod
        today={TODAY}
        value={{ range: 'this-month' }}
        compareOptions={['none', SIMILAR, 'previous-period']}
      />
    )
    const dialog = await openPicker()
    expect(compareSwitch(dialog)).not.toBeChecked()
    await userEvent.click(compareSwitch(dialog))
    expect(choice(dialog, 'Similar venues')).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })

  it('shows no comparison at all with an empty list', async () => {
    render(
      <DashboardPeriod
        today={TODAY}
        value={{ range: 'this-month' }}
        compareOptions={[]}
      />
    )
    const dialog = await openPicker()
    expect(within(dialog).queryByRole('switch')).toBeNull()
    expect(
      within(dialog).queryByRole('group', { name: 'Compare with' })
    ).toBeNull()
  })

  it('passes an app’s own comparison through, with its description', async () => {
    const onValueChange = vi.fn()
    render(
      <DashboardPeriod
        today={TODAY}
        value={THIS_MONTH}
        onValueChange={onValueChange}
        compareOptions={WITH_SIMILAR}
      />
    )
    const dialog = await openPicker()
    await userEvent.click(choice(dialog, 'Similar venues'))
    expect(compareDates(dialog)).toHaveTextContent(
      'Venues of a like size in Melbourne'
    )
    await apply(dialog)
    expect(onValueChange).toHaveBeenCalledWith({
      range: 'this-month',
      compare: 'similar'
    })
  })

  it('names an app’s own comparison on the button, without dates', async () => {
    render(
      <DashboardPeriod
        today={TODAY}
        value={{ range: 'this-month', compare: 'similar' }}
        compareOptions={WITH_SIMILAR}
      />
    )
    expect(picker()).toHaveAccessibleName(
      'Choose dates, Period (This month, 1 to 31 Oct 2026, vs similar venues)'
    )
    const dialog = await openPicker()
    expect(choice(dialog, 'Similar venues')).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })

  it('shows nothing under an app’s own comparison with no description', async () => {
    render(
      <DashboardPeriod
        today={TODAY}
        value={{ range: 'this-month', compare: 'similar' }}
        compareOptions={[{ value: 'similar', label: 'Similar venues' }]}
      />
    )
    const dialog = await openPicker()
    expect(compareDates(dialog)).toBeEmptyDOMElement()
  })

  it('keeps an acronym’s capitals on the button', () => {
    render(
      <DashboardPeriod
        today={TODAY}
        value={{ range: 'this-month', compare: 'ga' }}
        compareOptions={[{ value: 'ga', label: 'GA venues' }]}
      />
    )
    expect(picker()).toHaveAccessibleName(/vs GA venues\)$/)
  })

  it('starts custom dates from the previous period and lets them change', async () => {
    const onValueChange = vi.fn()
    render(
      <DashboardPeriod
        today={TODAY}
        value={THIS_MONTH}
        onValueChange={onValueChange}
        compareOptions={WITH_SIMILAR}
      />
    )
    const dialog = await openPicker()
    expect(comparisonPicker(dialog)).toBeNull()
    await userEvent.click(choice(dialog, 'Custom dates'))
    expect(comparisonPicker(dialog)).toHaveAccessibleName(
      'Choose dates, Comparison dates (1 to 30 Sept 2026)'
    )
    await userEvent.click(comparisonPicker(dialog)!)
    const dialogs = await screen.findAllByRole('dialog')
    const nested = dialogs.at(-1)!
    await userEvent.click(
      nested.querySelector<HTMLElement>(
        '[data-slot="calendar"] button[data-date="2026-09-14"]:not([data-outside])'
      )!
    )
    await userEvent.click(
      nested.querySelector<HTMLElement>(
        '[data-slot="calendar"] button[data-date="2026-09-20"]:not([data-outside])'
      )!
    )
    await waitFor(() =>
      expect(comparisonPicker(dialog)).toHaveAccessibleName(
        'Choose dates, Comparison dates (14 to 20 Sept 2026)'
      )
    )
    expect(onValueChange).not.toHaveBeenCalled()
    await apply(dialog)
    expect(onValueChange).toHaveBeenCalledWith({
      range: 'this-month',
      compare: { start: '2026-09-14', end: '2026-09-20' }
    })
  })

  it('keeps custom dates when switching away and back', async () => {
    render(
      <DashboardPeriod
        today={TODAY}
        value={{
          range: 'this-month',
          compare: { start: '2026-09-14', end: '2026-09-20' }
        }}
        compareOptions={WITH_SIMILAR}
      />
    )
    const dialog = await openPicker()
    expect(comparisonPicker(dialog)).toHaveAccessibleName(
      'Choose dates, Comparison dates (14 to 20 Sept 2026)'
    )
    await userEvent.click(choice(dialog, 'Previous year'))
    expect(comparisonPicker(dialog)).toBeNull()
    await userEvent.click(choice(dialog, 'Custom dates'))
    expect(comparisonPicker(dialog)).toHaveAccessibleName(
      'Choose dates, Comparison dates (14 to 20 Sept 2026)'
    )
  })

  it('keeps unlisted custom dates read only, as by default', async () => {
    render(
      <DashboardPeriod
        today={TODAY}
        value={{
          range: 'this-month',
          compare: { start: '2026-09-01', end: '2026-09-07' }
        }}
      />
    )
    const dialog = await openPicker()
    expect(choice(dialog, 'Custom dates')).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(comparisonPicker(dialog)).toBeNull()
    expect(compareDates(dialog)).toHaveTextContent('1 to 7 Sept 2026')
  })

  it('applies no comparison when the list has no none and nothing is chosen', async () => {
    const onValueChange = vi.fn()
    render(
      <DashboardPeriod
        today={TODAY}
        value={{ range: 'this-month' }}
        onValueChange={onValueChange}
        compareOptions={WITH_SIMILAR}
      />
    )
    const dialog = await openPicker()
    expect(
      within(within(dialog).getByRole('group', { name: 'Compare with' }))
        .getAllByRole('button')
        .filter((button) => button.getAttribute('aria-pressed') === 'true')
    ).toEqual([])
    await userEvent.click(
      within(dialog).getByRole('button', { name: /^Last 30 days/ })
    )
    await apply(dialog)
    expect(onValueChange).toHaveBeenCalledWith({
      range: { direction: 'past', amount: 30, unit: 'day' }
    })
  })

  it('turns Compare on with the first choice that has dates', async () => {
    render(
      <DashboardPeriod
        today={TODAY}
        value={{ range: 'upcoming' }}
        compareOptions={['none', 'custom', 'previous-year']}
      />
    )
    const dialog = await openPicker()
    await userEvent.click(compareSwitch(dialog))
    expect(compareSwitch(dialog)).toBeChecked()
    expect(choice(dialog, 'Previous year')).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(choice(dialog, 'Custom dates')).toBeDisabled()
  })

  it('leaves out app values that are Roadie’s, and repeats, with a warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <DashboardPeriod
        today={TODAY}
        value={THIS_MONTH}
        compareOptions={[
          'previous-period',
          'previous-period',
          { value: 'custom', label: 'Custom benchmark' },
          SIMILAR,
          { ...SIMILAR, label: 'Similar again' }
        ]}
      />
    )
    const dialog = await openPicker()
    expect(choiceNames(dialog)).toEqual(['Previous period', 'Similar venues'])
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"custom"'))
    warn.mockRestore()
  })

  it('shows an app comparison the list doesn’t name, by its value', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <DashboardPeriod
        today={TODAY}
        value={{ range: 'this-month', compare: 'similar' }}
      />
    )
    expect(picker()).toHaveAccessibleName(/vs similar\)$/)
    const dialog = await openPicker()
    expect(choice(dialog, 'similar')).toHaveAttribute('aria-pressed', 'true')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"similar"'))
    warn.mockRestore()
  })

  it('starts uncontrolled from the first listed comparison', () => {
    render(<DashboardPeriod today={TODAY} compareOptions={[SIMILAR]} />)
    expect(picker()).toHaveAccessibleName(/vs similar venues\)$/)
  })

  it('follows custom dates the parent changes while the picker is open', async () => {
    const at = (start: string, end: string) => ({
      range: 'this-month' as const,
      compare: { start, end }
    })
    const { rerender } = render(
      <DashboardPeriod
        today={TODAY}
        value={at('2026-09-01', '2026-09-07')}
        compareOptions={WITH_SIMILAR}
      />
    )
    const dialog = await openPicker()
    rerender(
      <DashboardPeriod
        today={TODAY}
        value={at('2026-09-14', '2026-09-20')}
        compareOptions={WITH_SIMILAR}
      />
    )
    await userEvent.click(choice(dialog, 'Previous year'))
    await userEvent.click(choice(dialog, 'Custom dates'))
    expect(comparisonPicker(dialog)).toHaveAccessibleName(
      'Choose dates, Comparison dates (14 to 20 Sept 2026)'
    )
  })

  it('turns the switch off when no choice has dates', async () => {
    render(
      <DashboardPeriod
        today={TODAY}
        value={{ range: 'upcoming' }}
        compareOptions={['none', 'custom']}
      />
    )
    const dialog = await openPicker()
    expect(compareSwitch(dialog)).toBeDisabled()
  })

  it('warns once under StrictMode', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <StrictMode>
        <DashboardPeriod
          today={TODAY}
          value={THIS_MONTH}
          compareOptions={[{ value: 'none', label: 'Nothing at all' }]}
        />
      </StrictMode>
    )
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })

  it('warns once for each problem, whatever else changes', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const twice = { value: 'twice', label: 'Twice' }
    const reserved = { value: 'previous-year', label: 'Last year' } as const
    const { rerender } = render(
      <DashboardPeriod
        today={TODAY}
        value={THIS_MONTH}
        compareOptions={[twice, twice, reserved]}
      />
    )
    rerender(
      <DashboardPeriod
        today={TODAY}
        value={THIS_MONTH}
        compareOptions={[twice, twice]}
      />
    )
    expect(
      warn.mock.calls.filter(([message]) => String(message).includes('"twice"'))
    ).toHaveLength(1)
    warn.mockRestore()
  })

  it('leaves out an app option with no value, with a warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <DashboardPeriod
        today={TODAY}
        value={THIS_MONTH}
        compareOptions={['previous-period', { value: '', label: 'Benchmark' }]}
      />
    )
    const dialog = await openPicker()
    expect(choiceNames(dialog)).toEqual(['Previous period'])
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"Benchmark"'))
    warn.mockRestore()
  })
})
