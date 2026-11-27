import type { ReactNode } from 'react'

import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Records, useRecords } from '.'
import { tableColumns, tableLayout } from '../RecordTable'
import { type TestShow, showFields, testShows } from './testUtils'

const column = tableColumns<TestShow>(showFields)
const layouts = [tableLayout([column.field('show'), column.field('city')])]

function Shows({ children }: { children: ReactNode }) {
  const records = useRecords({ data: testShows(3), fields: showFields })
  return (
    <Records records={records} layouts={layouts} caption='Shows'>
      {children}
      <Records.Content />
    </Records>
  )
}

const deprecation = (warn: { mock: { calls: unknown[][] } }) =>
  warn.mock.calls.filter(([message]) =>
    String(message).includes('Records.Options is deprecated')
  )

afterEach(() => vi.restoreAllMocks())

// The warning is once per page, so the header's case runs first.
describe('Records.Options', () => {
  it('leaves the standard header’s Configure unwarned', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <Shows>
        <Records.Header />
      </Shows>
    )
    expect(screen.getByRole('button', { name: 'Configure table' })).toBeTruthy()
    expect(deprecation(warn)).toHaveLength(0)
  })

  it('still renders, and warns once to use Records.View', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { rerender } = render(
      <Shows>
        <Records.Options />
        <Records.Options label='Sort' />
      </Shows>
    )
    rerender(
      <Shows>
        <Records.Options />
      </Shows>
    )
    expect(screen.getByRole('button', { name: 'Configure table' })).toBeTruthy()
    expect(deprecation(warn)).toHaveLength(1)
    expect(deprecation(warn)[0]![0]).toContain('Use Records.View')
  })
})
