import { useState } from 'react'

import { screen } from '@testing-library/react'

import { Sortable, type SortableProps, type SortableTransfer } from '.'
import { List } from '../List'

export type Transfer = (transfer: SortableTransfer) => void
type Lists = Record<string, string[]>

export function Lanes({
  initial = { todo: ['Date', 'Event'], done: ['SKU'] },
  onTransfer,
  canDrop,
  done,
  doneZone = 'min-h-24'
}: {
  initial?: Lists
  onTransfer?: Transfer
  canDrop?: SortableProps['canDrop']
  done?: Partial<Pick<SortableProps, 'disabled' | 'onTransfer'>>
  doneZone?: string
}) {
  const [lists, setLists] = useState(initial)
  return (
    <div className='grid grid-cols-2 gap-4'>
      {Object.entries(lists).map(([list, items]) => (
        <Sortable
          key={list}
          group='lanes'
          value={list}
          label={list}
          items={items}
          onReorder={(next) => setLists((all) => ({ ...all, [list]: next }))}
          onTransfer={(transfer) => {
            setLists((all) => applyTransfer(all, transfer))
            onTransfer?.(transfer)
          }}
          canDrop={list === 'done' ? canDrop : undefined}
          {...(list === 'done' ? done : undefined)}
        >
          <Sortable.DropZone
            data-testid={list}
            className={list === 'done' ? doneZone : 'min-h-24'}
          >
            <List>
              {items.map((value) => (
                <List.Item key={value} value={value} title={value} />
              ))}
            </List>
          </Sortable.DropZone>
        </Sortable>
      ))}
    </div>
  )
}

function applyTransfer(
  lists: Lists,
  { value, from, to, index }: SortableTransfer
) {
  const target = lists[to]!.filter((item) => item !== value)
  target.splice(index, 0, value)
  return {
    ...lists,
    [from]: lists[from]!.filter((item) => item !== value),
    [to]: target
  }
}

export const listed = (list: string) =>
  Array.from(
    screen.getByTestId(list).querySelectorAll('[data-slot="sortable-item"]')
  ).map((element) => element.textContent)
