import { act } from 'react'

import { screen } from '@testing-library/react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, onTestFinished, vi } from 'vitest'

import { DateRangePicker } from '.'

async function hydrate(picker: React.ReactElement) {
  const container = document.createElement('div')
  container.innerHTML = renderToString(picker)
  document.body.append(container)
  onTestFinished(() => container.remove())
  const serverText = container.querySelector(
    '[data-slot="date-range-picker-trigger"]'
  )!.textContent
  const onRecoverableError = vi.fn()
  const root = await act(async () =>
    hydrateRoot(container, picker, { onRecoverableError })
  )
  onTestFinished(() => act(() => root.unmount()))
  expect(onRecoverableError).not.toHaveBeenCalled()
  return serverText
}

describe('DateRangePicker hydrated', () => {
  it('names a relative range on the server and adds its dates once today is known', async () => {
    vi.useFakeTimers({
      now: new Date('2026-10-07T02:00:00Z'),
      toFake: ['Date']
    })
    onTestFinished(() => {
      vi.useRealTimers()
    })
    const serverText = await hydrate(
      <DateRangePicker
        aria-label='Period'
        timeZone='Australia/Sydney'
        defaultValue={{ direction: 'past', amount: 7, unit: 'day' }}
      />
    )
    expect(serverText).toBe('Last 7 days')
    expect(
      screen.getByRole('button', { name: /^Choose dates/ })
    ).toHaveTextContent('Last 7 days 1 to 7 Oct 2026')
  })

  it('names absolute dates the same on the server and the client', async () => {
    const serverText = await hydrate(
      <DateRangePicker
        aria-label='Period'
        defaultValue={{ start: '2026-10-01', end: '2026-10-07' }}
      />
    )
    expect(serverText).toBe('1 to 7 Oct 2026')
  })
})
