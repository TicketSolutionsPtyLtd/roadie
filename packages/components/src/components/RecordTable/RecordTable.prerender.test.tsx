import { Suspense } from 'react'

import { screen, within } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { RecordView } from '@oztix/roadie-core/records'

import { hydrateWithoutClock, withoutClock } from '../../utils/testUtils'
import { type TestShow, showFields, testShows } from '../Records/testUtils'
import { RecordTable } from './RecordTablePreset'
import { tableColumns } from './columns'

const column = tableColumns<TestShow>(showFields)
const columns = [column.field('show', { pin: true }), column.field('starts')]
// Starts on the 1st of each month in 2026.
const SHOWS = testShows(12).map((show, index) => ({
  ...show,
  starts: `2026-${String(index + 1).padStart(2, '0')}-01`
}))
const UPCOMING: Partial<RecordView> = {
  query: {
    search: '',
    filters: [{ field: 'starts', operator: 'within', value: 'upcoming' }],
    sort: []
  }
}

type Props = Partial<React.ComponentProps<typeof RecordTable<TestShow>>>
const table = (props: Props = {}) => (
  <RecordTable
    caption='Shows'
    data={SHOWS}
    fields={showFields}
    columns={columns}
    getRowId={(row) => row.id}
    timeZone='Australia/Brisbane'
    defaultPosition={{ pageSize: 20 }}
    {...props}
  />
)
const shownShows = () =>
  within(screen.getByRole('table'))
    .queryAllByRole('row')
    .slice(1)
    .map((row) => row.textContent)
const firstShow = (html: string) => html.includes(SHOWS[0]!.show)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  // 9 Oct 2026, so the November and December shows are upcoming.
  vi.setSystemTime(new Date('2026-10-09T00:00:00Z'))
})
afterEach(() => vi.useRealTimers())

describe('RecordTable on a prerendering server', () => {
  it('renders its rows without reading the clock', async () => {
    const { serverHtml, onRecoverableError } =
      await hydrateWithoutClock(table())
    expect(firstShow(serverHtml)).toBe(true)
    expect(onRecoverableError).not.toHaveBeenCalled()
    expect(shownShows()).toHaveLength(12)
  })

  it('renders as a Suspense fallback without reading the clock', () => {
    const pending = new Promise<never>(() => {})
    function Never(): never {
      throw pending
    }
    expect(() =>
      withoutClock(() =>
        renderToString(
          <Suspense fallback={table()}>
            <Never />
          </Suspense>
        )
      )
    ).not.toThrow()
  })

  it('resolves a relative filter at the given now', async () => {
    const { serverHtml, onRecoverableError } = await hydrateWithoutClock(
      table({
        defaultView: UPCOMING,
        now: new Date('2026-06-15T00:00:00Z')
      })
    )
    expect(firstShow(serverHtml)).toBe(false)
    expect(onRecoverableError).not.toHaveBeenCalled()
    expect(shownShows()).toHaveLength(6)
  })

  // Without a now, the server can't know which shows are upcoming.
  it('loads until the browser knows the date for a relative filter', async () => {
    const { serverHtml, onRecoverableError } = await hydrateWithoutClock(
      table({ defaultView: UPCOMING })
    )
    expect(serverHtml).toContain('aria-busy="true"')
    expect(onRecoverableError).not.toHaveBeenCalled()
    expect(screen.getByRole('table')).not.toHaveAttribute('aria-busy')
    expect(shownShows()).toHaveLength(2)
  })
})
