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

// On a phone the toolbar's actions fold into More actions, as the server paints them.
export const WithActions = () => (
  <RecordGrid
    caption='Shows'
    data={testShows(6)}
    fields={showFields}
    getRowId={(row) => row.id}
    card={{ title: 'show', description: 'city' }}
    actions={[
      { label: 'Export CSV', onAction: () => {} },
      { label: 'Print door list', onAction: () => {} }
    ]}
  />
)

// Grouped: each group's title opens and closes it, open as the server paints it.
export const Grouped = () => (
  <RecordGrid
    caption='Shows'
    data={testShows(12)}
    fields={showFields}
    getRowId={(row) => row.id}
    defaultView={{ layout: { type: 'grid', groupBy: ['status'] } }}
    card={{ title: 'show', description: 'city' }}
  />
)
