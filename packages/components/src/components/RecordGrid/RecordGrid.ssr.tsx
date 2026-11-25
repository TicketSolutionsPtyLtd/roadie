import { RecordGrid } from '.'
import type { RecordsRangeResult } from '../Records'
import { type TestShow, showFields, testShows } from '../Records/testUtils'

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

// Past VIRTUALISE_AFTER, so only the cards near the screen render.
export const ThreeHundredCards = grid(300, 300)

// Range mode as the server paints it: the first range still loading. The zone
// is set, as the range's key holds it and the viewer's would start it over.
export const LoadingRange = () => (
  <RecordGrid
    caption='Shows'
    timeZone='UTC'
    fields={showFields}
    getRowId={(row: TestShow) => row.id}
    loadRange={() => new Promise<RecordsRangeResult<TestShow>>(() => {})}
    card={{ title: 'show', description: 'city' }}
  />
)
