import { RecordList } from '.'
import { groupedShowFields, testShows } from '../Records/testUtils'

const list = (groupBy?: string[]) => () => (
  <RecordList
    caption='Shows'
    data={testShows(12)}
    fields={groupedShowFields}
    getRowId={(row) => row.id}
    row={{ title: 'show', description: 'city' }}
    defaultView={groupBy && { layout: { type: 'list', groupBy } }}
  />
)

export const Ungrouped = list()

// Each group's title is a disclosure, open as the server paints it.
export const GroupedByTwoLevels = list(['status', 'city'])
