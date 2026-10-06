import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { RecordQuery } from '@oztix/roadie-core/records'

import { type TestShow, showFields } from '../Records/testUtils'
import { tableColumns } from './columns'
import type { RecordTableColumn } from './types'
import { useColumnWidths } from './useColumnWidths'

const column = tableColumns<TestShow>(showFields)
const columns: readonly RecordTableColumn[] = [
  column.field('show'),
  column.field('city')
] as readonly RecordTableColumn[]
const show = (name: string, city = 'Perth') =>
  ({ id: name, show: name, city }) as unknown as TestShow
const short = [show('Ari'), show('Bo')]
const long = [show('The Copper Hall long name show of the century, part two')]
const query = (search = ''): RecordQuery => ({ search, filters: [], sort: [] })

type Props = {
  mode: 'browser' | 'server' | 'range'
  data: readonly object[]
  search?: string
}
const setup = (initial: Props) =>
  renderHook(
    ({ mode, data, search }: Props) =>
      useColumnWidths(columns, {
        mode,
        data,
        query: query(search),
        timeZone: 'UTC'
      }),
    { initialProps: initial }
  )

const showWidth = (widths: { min: number }[]) => widths[0]!.min

describe('useColumnWidths', () => {
  it('follows the data in the browser', () => {
    const { result, rerender } = setup({ mode: 'browser', data: short })
    const before = showWidth(result.current)
    rerender({ mode: 'browser', data: long })
    expect(showWidth(result.current)).toBeGreaterThan(before)
  })

  it.each(['server', 'range'] as const)(
    'holds widths across pages and ranges of one search (%s)',
    (mode) => {
      const { result, rerender } = setup({ mode, data: short })
      const before = result.current
      rerender({ mode, data: long })
      expect(result.current).toBe(before)
    }
  )

  it('samples a new search once its records arrive, then holds', () => {
    const { result, rerender } = setup({ mode: 'server', data: short })
    const before = showWidth(result.current)
    rerender({ mode: 'server', data: short, search: 'copper' })
    expect(showWidth(result.current)).toBe(before)
    rerender({ mode: 'server', data: long, search: 'copper' })
    const grown = showWidth(result.current)
    expect(grown).toBeGreaterThan(before)
    rerender({ mode: 'server', data: short, search: 'copper' })
    expect(showWidth(result.current)).toBe(grown)
  })

  it('waits past an empty first load', () => {
    const { result, rerender } = setup({ mode: 'range', data: [] })
    const before = showWidth(result.current)
    rerender({ mode: 'range', data: long })
    expect(showWidth(result.current)).toBeGreaterThan(before)
  })
})
