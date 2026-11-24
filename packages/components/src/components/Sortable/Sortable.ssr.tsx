import { Sortable } from '.'
import { List } from '../List'

const columns = ['Date', 'Event', 'Price']

export const ColumnList = () => (
  <Sortable items={columns} onReorder={() => {}} label='columns'>
    <List>
      {columns.map((column) => (
        <List.Item key={column} value={column} title={column} />
      ))}
    </List>
  </Sortable>
)
