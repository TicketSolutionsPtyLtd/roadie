import { RecordTable, tableColumns } from '.'
import { allowing } from '../../utils/hydrationTestUtils'
import { Pane } from '../Pane'
import { groupedShowFields, showFields, testShows } from '../Records/testUtils'

const column = tableColumns(showFields)
const columns = (['city', 'sold', 'gross'] as const).map((key) =>
  column.field(key)
)
const table = (rows: number, selectable?: boolean) => (
  <RecordTable
    caption='Upcoming shows'
    data={testShows(rows)}
    fields={showFields}
    columns={[column.field('show', { pin: true }), ...columns]}
    getRowId={(row) => row.id}
    defaultPosition={{ pageSize: rows }}
    selectable={selectable}
  />
)

const phone = (shift: number, removed: number) => ({
  ticket: 'INNO-1686',
  shift,
  removed
})

export const SixtyRows = () => table(60)

// The window trims a row past the screen once it measures; nothing moves.
export const ThreeHundredRows = allowing(() => table(300), {
  390: phone(0, 1),
  1280: phone(0, 2)
})

export const SelectableInPane = allowing(
  () => (
    <div className='h-120 rounded-2xl bg-sunken p-3'>
      <Pane className='h-full'>
        <Pane.Header>
          <Pane.Title>Shows</Pane.Title>
        </Pane.Header>
        {table(60, true)}
      </Pane>
    </div>
  ),
  { 390: phone(93, 142), 1280: { ticket: 'INNO-1678', shift: 98 } }
)

// Each group's title is a disclosure, open as the server paints it. A phone
// swaps the wide table for narrow rows as every table here does.
export const GroupedByTwoLevels = allowing(
  () => (
    <RecordTable
      caption='Upcoming shows'
      data={testShows(12)}
      fields={groupedShowFields}
      columns={[column.field('show'), ...columns]}
      getRowId={(row) => row.id}
      defaultView={{ layout: { type: 'table', groupBy: ['status', 'city'] } }}
    />
  ),
  { 390: phone(44, 50) }
)
