import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { hydrateWithoutClock } from '../../utils/testUtils'
import { Records, useRecords } from '../Records'
import { type TestShow, showFields, testShows } from '../Records/testUtils'
import { calendarLayout } from './calendarLayout'

function Shows({ defaultMonth }: { defaultMonth?: string }) {
  const records = useRecords<TestShow>({
    data: testShows(12),
    fields: showFields,
    getRowId: (row) => row.id,
    timeZone: 'Australia/Brisbane'
  })
  const layouts = [
    calendarLayout<TestShow>({
      dateField: 'starts',
      title: 'show',
      defaultMonth
    })
  ]
  return (
    <Records records={records} layouts={layouts}>
      <Records.Content />
    </Records>
  )
}
const calendar = (defaultMonth?: string) => (
  <Shows defaultMonth={defaultMonth} />
)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-20T00:00:00Z'))
})
afterEach(() => vi.useRealTimers())

describe('RecordCalendar on a prerendering server', () => {
  it('renders without the clock, then opens on this month and marks today', async () => {
    const { serverHtml, onRecoverableError } =
      await hydrateWithoutClock(calendar())
    expect(serverHtml).not.toContain('aria-current')
    expect(serverHtml).not.toContain('November 2026')
    expect(onRecoverableError).not.toHaveBeenCalled()
    expect(await screen.findByText('November 2026')).toBeInTheDocument()
    expect(document.querySelector('[aria-current="date"]')).toHaveAttribute(
      'data-date',
      '2026-11-20'
    )
  })

  it('renders the default month and its records on the server', async () => {
    const { serverHtml, onRecoverableError } = await hydrateWithoutClock(
      calendar('2026-03-14')
    )
    expect(serverHtml).toContain('March 2026')
    // testShows puts show-2 on 3 March.
    expect(serverHtml).toContain('Julia Jacklin 1')
    expect(onRecoverableError).not.toHaveBeenCalled()
  })
})
