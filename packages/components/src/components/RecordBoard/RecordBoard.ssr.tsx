import { useState } from 'react'

import { boardLayout } from '.'
import { Records, useRecords } from '../Records'
import {
  type TestShow,
  groupedShowFields,
  testShows
} from '../Records/testUtils'

const board = (groupBy: readonly (keyof TestShow & string)[]) =>
  function Board() {
    const records = useRecords({
      data: testShows(12),
      fields: groupedShowFields,
      getRowId: (row) => row.id
    })
    const [layouts] = useState(() => [
      boardLayout<TestShow>({
        groupBy,
        title: 'show',
        description: 'city',
        onMove: () => {}
      })
    ])
    return (
      <Records records={records} layouts={layouts} caption='Shows'>
        <Records.Content />
      </Records>
    )
  }

export const Columns = board(['status'])

// Each lane's title is a disclosure, open as the server paints it, under a header that sticks.
export const Lanes = board(['status', 'city'])
