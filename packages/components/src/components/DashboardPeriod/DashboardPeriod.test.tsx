import { useState } from 'react'

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { DashboardPeriod, type DashboardPeriodValue } from '.'
import { onPhone } from '../../pickers/testUtils'

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

  it('keeps its period without calling itself required', async () => {
    onPhone()
    render(<DashboardPeriod today={TODAY} value={THIS_MONTH} />)
    expect(picker()).not.toHaveAccessibleDescription(/Required/)
    const dialog = await openPicker()
    expect(within(dialog).queryByRole('button', { name: 'Clear' })).toBeNull()
  })

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
