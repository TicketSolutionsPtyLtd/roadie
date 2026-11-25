import { RecordGrid } from '.'
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

// Past VIRTUALISE_AFTER, so only the cards near the screen render.
export const ThreeHundredCards = grid(300, 300)
