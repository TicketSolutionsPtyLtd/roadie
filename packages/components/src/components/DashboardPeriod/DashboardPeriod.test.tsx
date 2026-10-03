import { useState } from 'react'

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { DashboardPeriod, type DashboardPeriodValue } from '.'

// Wed 7 Oct 2026.
const TODAY = '2026-10-07'
const THIS_MONTH: DashboardPeriodValue = {
  range: 'this-month',
  compare: 'previous-period'
}

const picker = () =>
  screen.getByRole('button', { name: /^Choose dates, Period/ })
const comparison = () => screen.getByRole('combobox', { name: 'Compare with' })

async function choose(name: RegExp) {
  await userEvent.click(comparison())
  await userEvent.click(await screen.findByRole('option', { name }))
}

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
  it('shows the period and what it compares with, as a named group', () => {
    render(<DashboardPeriod today={TODAY} value={THIS_MONTH} />)
    expect(
      screen.getByRole('group', { name: 'Dashboard period' })
    ).toBeInTheDocument()
    expect(picker()).toHaveAccessibleName(
      'Choose dates, Period (This month, 1 to 31 Oct 2026)'
    )
    expect(comparison()).toHaveTextContent('vs previous period')
  })

  it('lists each comparison with the dates it covers', async () => {
    render(<DashboardPeriod today={TODAY} value={THIS_MONTH} />)
    await userEvent.click(comparison())
    const options = await screen.findAllByRole('option')
    expect(options[0]).toHaveAccessibleName(
      'Previous period, 1 to 30 Sept 2026'
    )
    expect(options[1]).toHaveAccessibleName('Previous year, 1 to 31 Oct 2025')
    expect(options[2]).toHaveAccessibleName('Custom dates')
    expect(options[3]).toHaveAccessibleName('No comparison')
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
    await userEvent.click(comparison())
    const options = await screen.findAllByRole('option')
    expect(options[0]).toHaveAccessibleName('Previous period, 1 to 7 Sept 2026')
    // Thu 1 to Wed 7 Oct 2026 against Thu 2 to Wed 8 Oct 2025.
    expect(options[1]).toHaveAccessibleName('Previous year, 2 to 8 Oct 2025')
  })

  it('starts custom dates from what the data reaches', async () => {
    const onValueChange = vi.fn()
    render(
      <DashboardPeriod
        today={TODAY}
        value={THIS_MONTH}
        dataEnd={TODAY}
        onValueChange={onValueChange}
      />
    )
    await choose(/^Custom dates/)
    expect(onValueChange).toHaveBeenLastCalledWith({
      range: 'this-month',
      compare: { start: '2026-09-01', end: '2026-09-07' }
    })
  })

  it('offers the spec’s dashboard presets by default', async () => {
    render(<DashboardPeriod today={TODAY} value={THIS_MONTH} />)
    await userEvent.click(picker())
    const dialog = await screen.findByRole('dialog')
    for (const name of [
      /^Next 30 days/,
      /^Next 90 days/,
      /^Last 30 days/,
      /^Last 12 months/,
      /^This financial year/
    ])
      expect(within(dialog).getByRole('button', { name })).toBeInTheDocument()
  })

  it('emits the comparison chosen with the same range', async () => {
    const onValueChange = vi.fn()
    render(<Controlled onValueChange={onValueChange} />)
    await choose(/^Previous year/)
    expect(onValueChange).toHaveBeenLastCalledWith({
      range: 'this-month',
      compare: 'previous-year'
    })
    expect(comparison()).toHaveTextContent('vs previous year')
  })

  it('drops the comparison for no comparison', async () => {
    const onValueChange = vi.fn()
    render(<Controlled onValueChange={onValueChange} />)
    await choose(/^No comparison/)
    expect(onValueChange).toHaveBeenLastCalledWith({ range: 'this-month' })
    expect(onValueChange.mock.lastCall![0]).not.toHaveProperty('compare')
    expect(comparison()).toHaveTextContent('No comparison')
  })

  it('starts custom dates from the previous period and shows their picker', async () => {
    const onValueChange = vi.fn()
    render(<Controlled onValueChange={onValueChange} />)
    expect(
      screen.queryByRole('button', { name: /^Choose dates, Comparison dates/ })
    ).not.toBeInTheDocument()
    await choose(/^Custom dates/)
    expect(onValueChange).toHaveBeenLastCalledWith({
      range: 'this-month',
      compare: { start: '2026-09-01', end: '2026-09-30' }
    })
    expect(comparison()).toHaveTextContent('vs custom dates')
    expect(
      screen.getByRole('button', { name: /^Choose dates, Comparison dates/ })
    ).toHaveAccessibleName('Choose dates, Comparison dates (1 to 30 Sept 2026)')
  })

  it('keeps the comparison when the period changes', async () => {
    const onValueChange = vi.fn()
    render(<Controlled onValueChange={onValueChange} />)
    await userEvent.click(picker())
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(
      within(dialog).getByRole('button', { name: /^Last 30 days/ })
    )
    expect(onValueChange).not.toHaveBeenCalled()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Apply' }))
    expect(onValueChange).toHaveBeenLastCalledWith({
      range: { direction: 'past', amount: 30, unit: 'day' },
      compare: 'previous-period'
    })
  })

  it('shows a set period without letting it change', async () => {
    render(<DashboardPeriod today={TODAY} value={THIS_MONTH} readOnly />)
    expect(picker()).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(comparison())
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
    expect(comparison()).toHaveAttribute('aria-readonly', 'true')
  })

  it('turns both controls off when disabled', () => {
    render(<DashboardPeriod today={TODAY} value={THIS_MONTH} disabled />)
    expect(picker()).toBeDisabled()
    expect(comparison()).toHaveAttribute('data-disabled')
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
    expect(comparison()).toHaveTextContent('No comparison')
    await choose(/^Previous period/)
    expect(onValueChange).toHaveBeenLastCalledWith({
      range: 'last-month',
      compare: 'previous-period'
    })
    expect(comparison()).toHaveTextContent('vs previous period')
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
