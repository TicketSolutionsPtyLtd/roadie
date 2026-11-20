import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { RecordsRequest } from '@oztix/roadie-core/records'

import { hydrateWithoutClock } from '../../utils/testUtils'
import { Records, useRecords } from '../Records'
import { type TestShow, showFields, testShows } from '../Records/testUtils'
import { calendarLayout } from './calendarLayout'

function Shows({
  defaultMonth,
  onRequestChange
}: {
  defaultMonth?: string
  onRequestChange?: (request: RecordsRequest) => void
}) {
  const records = useRecords<TestShow>({
    data: testShows(12),
    fields: showFields,
    getRowId: (row) => row.id,
    timeZone: 'Australia/Brisbane',
    ...(onRequestChange && { rowCount: 12, onRequestChange })
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

  it('sends one request once hydrated, for the weeks of this month', async () => {
    const heard = vi.fn()
    await hydrateWithoutClock(<Shows onRequestChange={heard} />)
    expect(await screen.findByText('November 2026')).toBeInTheDocument()
    expect(heard).toHaveBeenCalledOnce()
    const [request] = heard.mock.calls[0] as [RecordsRequest]
    expect(request).not.toHaveProperty('page')
    expect(request.query.filters).toEqual([
      {
        field: 'starts',
        operator: 'overlaps',
        range: { kind: 'dates', start: '2026-10-26', end: '2026-12-06' }
      }
    ])
  })
})
