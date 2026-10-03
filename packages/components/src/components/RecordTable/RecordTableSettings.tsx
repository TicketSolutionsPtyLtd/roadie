'use client'

import { useId } from 'react'

import { EyeIcon, EyeSlashIcon, PushPinIcon } from '@phosphor-icons/react'

import { List } from '../List'
import { useRecordsContext } from '../Records/context'
import { Sortable } from '../Sortable'
import { Toggle } from '../Toggle'
import { columnSettings, tableColumnsLayout } from './columns'
import type { TableLayoutConfig } from './tableLayout'

const listFormat = new Intl.ListFormat('en-AU', {
  style: 'long',
  type: 'conjunction'
})

/** The table's part of `Records.Options`: its columns, reordered by drag and shown or hidden. */
export function RecordTableSettings({ config }: { config: TableLayoutConfig }) {
  const { records } = useRecordsContext()
  const headingId = useId()
  const lastShownId = useId()
  const { pinned, columns } = columnSettings(
    config.columns,
    records.view.layout
  )
  if (columns.length === 0) return null

  const order = columns.map(({ column }) => column.key)
  const hidden = columns
    .filter((setting) => setting.hidden)
    .map(({ column }) => column.key)
  const shownCount = pinned.length + columns.length - hidden.length
  const write = (next: { order: string[]; hidden: string[] }) =>
    records.setLayout(
      tableColumnsLayout(config.columns, next, records.view.layout)
    )

  return (
    <section aria-labelledby={headingId} className='grid gap-2'>
      <h3 id={headingId} className='text-display-ui-6 text-strong'>
        Columns
      </h3>
      {pinned.length > 0 && (
        <p className='flex items-center gap-2 text-sm text-subtle'>
          <PushPinIcon weight='bold' className='size-4 shrink-0' aria-hidden />
          {`${listFormat.format(pinned.map(({ field }) => field.label))} ${pinned.length === 1 ? 'stays' : 'stay'} first`}
        </p>
      )}
      <Sortable
        items={order}
        label='columns'
        onReorder={(next) => write({ order: next, hidden })}
      >
        <List>
          {columns.map(({ column, hidden: isHidden }) => {
            const { label } = column.field
            return (
              <List.Item
                key={column.key}
                value={column.key}
                title={label}
                className={
                  isHidden
                    ? '[&_[data-slot=list-item-title]]:text-subtle'
                    : undefined
                }
                trailing={
                  <Toggle
                    aria-label={`Show ${label}`}
                    size='sm'
                    emphasis='subtler'
                    pressed={!isHidden}
                    disabled={!isHidden && shownCount === 1}
                    aria-describedby={
                      !isHidden && shownCount === 1 ? lastShownId : undefined
                    }
                    onPressedChange={(show) =>
                      write({
                        order,
                        hidden: show
                          ? hidden.filter((key) => key !== column.key)
                          : [...hidden, column.key]
                      })
                    }
                  >
                    {isHidden ? (
                      <EyeSlashIcon weight='bold' className='size-4' />
                    ) : (
                      <EyeIcon weight='bold' className='size-4' />
                    )}
                  </Toggle>
                }
              />
            )
          })}
        </List>
      </Sortable>
      <span id={lastShownId} hidden>
        A table shows at least one column
      </span>
    </section>
  )
}
RecordTableSettings.displayName = 'RecordTableSettings'
