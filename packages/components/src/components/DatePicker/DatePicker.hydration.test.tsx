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

describe('DatePicker uncontrolled', () => {
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
      '2026-11-27T19:30:00+11:00'
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
    expect(time).toHaveValue('7:30pm')
  })
})
