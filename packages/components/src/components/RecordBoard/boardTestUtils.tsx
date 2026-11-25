import { useState } from 'react'

import { screen, within } from '@testing-library/react'

import { boardLayout } from '.'
import { Records, useRecords } from '../Records'
import { type TestShow, showFields, testShows } from '../Records/testUtils'
import type { RecordsField } from '../Records/types'
import type { RecordGroupChanges } from './types'

export type Move = (
  show: TestShow,
  changes: RecordGroupChanges<TestShow>
) => void | Promise<void>

const initial = testShows(4).map((show, index) =>
  index === 3 ? { ...show, status: '' } : show
)

export function Shows({
  onMove,
  width = 1100,
  shows = initial,
  fields = showFields,
  movable = true,
  selected,
  save = (_, status) => status ?? ''
}: {
  onMove?: Move
  width?: number
  shows?: TestShow[]
  fields?: readonly RecordsField[]
  movable?: boolean
  selected?: string[]
  /** The status the app stores once a move resolves, or undefined to leave its data as it was. */
  save?: (show: TestShow, status: string | null) => string | undefined
}) {
  const [data, setData] = useState(shows)
  const records = useRecords({
    data,
    fields,
    getRowId: (row) => row.id,
    selectable: selected !== undefined,
    defaultSelection: selected && { ids: selected }
  })
  const [layouts] = useState(() => [
    boardLayout<TestShow>({
      groupBy: 'status',
      title: 'show',
      description: 'city',
      onMove: movable
        ? async (show, changes) => {
            await onMove?.(show, changes)
            const saved = save(show, changes.status ?? null)
            if (saved === undefined) return
            setData((all) =>
              all.map((row) =>
                row.id === show.id ? { ...row, status: saved } : row
              )
            )
          }
        : undefined
    })
  ])
  return (
    <div style={{ width }}>
      <Records records={records} layouts={layouts} caption='Shows'>
        <Records.Content />
      </Records>
    </div>
  )
}

export const column = (name: string | RegExp) =>
  screen.getByRole('region', { name })
export const titles = (name: string | RegExp) =>
  within(column(name))
    .queryAllByRole('listitem')
    .map((item) => item.querySelector('[data-slot="card-title"]')!.textContent)
