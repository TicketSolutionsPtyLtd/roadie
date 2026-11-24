import { RecordGrid } from '.'
import { allowing } from '../../utils/hydrationTestUtils'
import { showFields, testShows } from '../Records/testUtils'

const grid = (shows: number, pageSize: number) => () => (
  <RecordGrid
    caption='Shows'
    data={testShows(shows)}
    fields={showFields}
    getRowId={(row) => row.id}
    defaultPosition={{ pageSize }}
    card={{ title: 'show', description: 'city' }}
  />
)

export const FirstPage = grid(60, 12)

export const ThreeHundredCards = allowing(grid(300, 300), {
  390: { ticket: 'INNO-1667', shift: 378, removed: 6 },
  1280: { ticket: 'INNO-1667', shift: 42_750 }
})
