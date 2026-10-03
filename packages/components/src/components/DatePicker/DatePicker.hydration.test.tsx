import { act } from 'react'

import { fireEvent, render, screen } from '@testing-library/react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, onTestFinished, vi } from 'vitest'

import { DatePicker } from '.'

// The viewer sits in Perth, which the server can't know.
vi.mock('@oztix/roadie-core/datetime', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@oztix/roadie-core/datetime')>()),
  viewerTimeZone: () => 'Australia/Perth'
}))

const DOORS = '2026-11-27T08:30:00Z'

describe('DatePicker with no timeZone', () => {
  it('renders the instant in UTC on the server, then the viewer’s zone', async () => {
    const picker = (
      <DatePicker
        aria-label='Doors'
        granularity='minute'
        defaultValue={DOORS}
      />
    )
    const container = document.createElement('div')
    container.innerHTML = renderToString(picker)
    document.body.append(container)
    onTestFinished(() => container.remove())
    expect(container.querySelector('[aria-label="Time"]')).toHaveValue('8:30am')
    const onRecoverableError = vi.fn()
    const root = await act(async () =>
      hydrateRoot(container, picker, { onRecoverableError })
    )
    onTestFinished(() => act(() => root.unmount()))
    expect(onRecoverableError).not.toHaveBeenCalled()
    expect(screen.getByRole('textbox', { name: 'Time' })).toHaveValue('4:30pm')
  })
})

async function hydrate(picker: React.ReactElement) {
  const container = document.createElement('div')
  container.innerHTML = renderToString(<form>{picker}</form>)
  document.body.append(container)
  onTestFinished(() => container.remove())
  const onRecoverableError = vi.fn()
  const root = await act(async () =>
    hydrateRoot(container, <form>{picker}</form>, { onRecoverableError })
  )
  onTestFinished(() => act(() => root.unmount()))
  expect(onRecoverableError).not.toHaveBeenCalled()
  return new FormData(container.querySelector('form')!)
}

describe('DatePicker hydrated in the viewer’s zone', () => {
  it('reads a wall-clock default on the viewer’s clock', async () => {
    const form = await hydrate(
      <DatePicker
        aria-label='Doors'
        granularity='minute'
        name='doors'
        defaultValue='2026-11-27T19:30'
      />
    )
    expect(screen.getByRole('textbox', { name: 'Time' })).toHaveValue('7:30pm')
    expect(form.get('doors')).toBe('2026-11-27T19:30:00+08:00')
  })

  it('reads an instant default as the viewer’s date', async () => {
    const form = await hydrate(
      <DatePicker
        aria-label='Show date'
        name='showDate'
        defaultValue='2026-11-27T20:00:00Z'
      />
    )
    expect(screen.getByRole('textbox')).toHaveValue('Sat 28 Nov 2026')
    expect(form.get('showDate')).toBe('2026-11-28')
  })

  it('submits the instant with the viewer’s offset', async () => {
    const form = await hydrate(
      <DatePicker
        aria-label='Doors'
        granularity='minute'
        name='doors'
        defaultValue={DOORS}
      />
    )
    expect(form.get('doors')).toBe('2026-11-27T16:30:00+08:00')
  })
})

describe('DatePicker uncontrolled', () => {
  it.each([
    ['day', 'minute', '', 'Fri 27 Nov 2026'],
    ['minute', 'day', '2026-11-27', 'Fri 27 Nov 2026']
  ] as const)(
    'submits the new shape when granularity goes from %s to %s',
    (from, to, submitted, shown) => {
      const picker = (granularity: 'day' | 'minute') => (
        <form>
          <DatePicker
            aria-label='Doors'
            granularity={granularity}
            timeZone='Australia/Melbourne'
            name='doors'
            defaultValue={
              from === 'day' ? '2026-11-27' : '2026-11-27T19:30:00+11:00'
            }
          />
        </form>
      )
      const { container, rerender } = render(picker(from))
      rerender(picker(to))
      expect(new FormData(container.querySelector('form')!).get('doors')).toBe(
        submitted
      )
      expect(
        container.querySelector('[data-slot="date-picker-input"]')
      ).toHaveValue(shown)
    }
  )

  it('keeps the instant when timeZone changes', async () => {
    const { container, rerender } = render(
      <form>
        <DatePicker
          aria-label='Doors'
          granularity='minute'
          timeZone='Australia/Melbourne'
          name='doors'
          defaultValue='2026-11-27T19:30:00+11:00'
        />
      </form>
    )
    rerender(
      <form>
        <DatePicker
          aria-label='Doors'
          granularity='minute'
          timeZone='Australia/Perth'
          name='doors'
          defaultValue='2026-11-27T19:30:00+11:00'
        />
      </form>
    )
    expect(screen.getByRole('textbox', { name: 'Time' })).toHaveValue('4:30pm')
    expect(new FormData(container.querySelector('form')!).get('doors')).toBe(
      '2026-11-27T16:30:00+08:00'
    )
  })
})

describe('DatePicker time during composition', () => {
  it('leaves arrow keys to the input method', () => {
    render(
      <DatePicker
        aria-label='Doors'
        granularity='minute'
        timeZone='Australia/Melbourne'
        defaultValue='2026-11-27T19:30:00+11:00'
      />
    )
    const time = screen.getByRole('textbox', { name: 'Time' })
    fireEvent.keyDown(time, { key: 'ArrowUp', isComposing: true })
    fireEvent.keyDown(time, { key: 'ArrowUp', keyCode: 229 })
    expect(time).toHaveValue('7:30pm')
  })
})
