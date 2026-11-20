import { useState } from 'react'

import { screen, within } from '@testing-library/react'

import { boardLayout } from '.'
import { Records, useRecords } from '../Records'
import { type TestShow, showFields, testShows } from '../Records/testUtils'

export type Move = (
  show: TestShow,
  status: string | null
) => void | Promise<void>

const initial = testShows(4).map((show, index) =>
  index === 3 ? { ...show, status: '' } : show
)

export function Shows({
  onMove,
  width = 1100,
  shows = initial,
  movable = true
}: {
  onMove?: Move
  width?: number
  shows?: TestShow[]
  movable?: boolean
}) {
  const [data, setData] = useState(shows)
  const records = useRecords({ data, fields: showFields })
  const [layouts] = useState(() => [
    boardLayout<TestShow>({
      groupBy: 'status',
      title: 'show',
      description: 'city',
      onMove: movable
        ? async (show, status) => {
            await onMove?.(show, status)
            setData((all) =>
              all.map((row) =>
                row.id === show.id ? { ...row, status: status ?? '' } : row
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
