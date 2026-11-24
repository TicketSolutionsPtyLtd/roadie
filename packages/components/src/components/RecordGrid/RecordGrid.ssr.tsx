import { RecordGrid } from '.'
import { showFields, testShows } from '../Records/testUtils'

const shows = testShows(60)

export const FirstPage = () => (
  <RecordGrid
    caption='Shows'
    data={shows}
    fields={showFields}
    getRowId={(row) => row.id}
    defaultPosition={{ pageSize: 12 }}
    card={{ title: 'show', description: 'city' }}
  />
)
