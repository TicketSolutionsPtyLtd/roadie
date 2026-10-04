'use client'

import { useMemo, useState } from 'react'

import type { RecordQuery } from '@oztix/roadie-core/records'

import { matchKey } from '../Records/selection'
import { columnWidths, sameWidths } from './layout'
import type { RecordColumnWidth, RecordTableColumn } from './types'

type Held = {
  widths: RecordColumnWidth[]
  columns: readonly RecordTableColumn[]
  key: string | undefined
  timeZone: string
  data: readonly object[]
  settled: boolean
}

/**
 * Each column's width, sampled from the records held. In the browser that's
 * every record. A server's page or range holds only some, so widths sample
 * the first records a search and filters bring and then hold, and columns
 * don't shift as people page or scroll.
 */
export function useColumnWidths(
  columns: readonly RecordTableColumn[],
  {
    mode,
    data,
    query,
    timeZone
  }: {
    mode: 'browser' | 'server' | 'range'
    data: readonly object[]
    query: RecordQuery
    timeZone: string
  }
): RecordColumnWidth[] {
  const sampled = useMemo(
    () => columnWidths(columns, data, timeZone),
    [columns, data, timeZone]
  )
  const key = mode === 'browser' ? undefined : matchKey(query)
  const sampling = mode !== 'browser'
  const [held, setHeld] = useState<Held>(() => ({
    widths: sampled,
    columns,
    key,
    timeZone,
    data,
    settled: sampling && data.length > 0
  }))
  const pick = () => (sameWidths(held.widths, sampled) ? held.widths : sampled)
  let next: Held | undefined
  if (
    held.columns !== columns ||
    held.timeZone !== timeZone ||
    held.key !== key
  )
    next = {
      widths: pick(),
      columns,
      key,
      timeZone,
      data,
      // A new search's records arrive after it; the same search's are here.
      settled: sampling && held.key === key && data.length > 0
    }
  else if (!held.settled && held.data !== data)
    next = {
      widths: pick(),
      columns,
      key,
      timeZone,
      data,
      settled: sampling && data.length > 0
    }
  if (!next) return held.widths
  setHeld(next)
  return next.widths
}
