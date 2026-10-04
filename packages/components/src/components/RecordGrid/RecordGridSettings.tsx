'use client'

import { useId, useLayoutEffect, useRef } from 'react'

import { EyeIcon, EyeSlashIcon } from '@phosphor-icons/react'

import type { RecordField } from '@oztix/roadie-core/records'
import { cn } from '@oztix/roadie-core/utils'

import { List } from '../List'
import { ListItemContent } from '../List/ListItemContent'
import { listItemVariants } from '../List/variants'
import { useRecordsContext } from '../Records/context'
import { Sortable } from '../Sortable'
import { Toggle } from '../Toggle'
import {
  definedDetails,
  detailCandidates,
  gridDetailsLayout,
  shownDetails
} from './parts'
import type { GridLayoutConfig } from './types'

/**
 * The grid's part of `Records.Options`: the fields each card lists, reordered
 * by drag and shown or hidden. A view keeps only the shown fields in order,
 * so hidden ones are listed apart, in the fields' own order.
 */
export function RecordGridSettings({ config }: { config: GridLayoutConfig }) {
  const { records } = useRecordsContext()
  const headingId = useId()
  const hiddenId = useId()
  const lastShownId = useId()
  const sectionRef = useRef<HTMLElement>(null)
  // The toggle used moves between the lists; focus follows its field there.
  const focusField = useRef<string | null>(null)
  const { fields, view } = records
  const candidates = detailCandidates(config, fields)
  const shown = shownDetails(config, fields, view.layout)

  useLayoutEffect(() => {
    const key = focusField.current
    if (key === null) return
    const toggle = sectionRef.current?.querySelector<HTMLElement>(
      `[data-card-field="${CSS.escape(key)}"]`
    )
    if (!toggle || toggle === document.activeElement) return
    focusField.current = null
    toggle.focus()
  })

  if (candidates.length === 0) return null

  const byKey = new Map(candidates.map((field) => [field.key, field]))
  const shownSet = new Set(shown)
  const hidden = candidates.filter((field) => !shownSet.has(field.key))
  // A view can't keep an empty list apart from the definition's, so with
  // details defined the last one stays.
  const lastLocked =
    shown.length === 1 && definedDetails(config, fields).length > 0
  const write = (next: readonly string[], focus?: string) => {
    focusField.current = focus ?? null
    records.setLayout(gridDetailsLayout(config, fields, next, view.layout))
  }
  const toggle = (field: RecordField, show: boolean) => {
    const locked = show && lastLocked
    return (
      <Toggle
        data-card-field={field.key}
        aria-label={`Show ${field.label}`}
        size='sm'
        emphasis='subtler'
        pressed={show}
        disabled={locked}
        aria-describedby={locked ? lastShownId : undefined}
        onPressedChange={(pressed) =>
          write(
            pressed
              ? [...shown, field.key]
              : shown.filter((key) => key !== field.key),
            field.key
          )
        }
      >
        {show ? (
          <EyeIcon weight='bold' className='size-4' />
        ) : (
          <EyeSlashIcon weight='bold' className='size-4' />
        )}
      </Toggle>
    )
  }

  return (
    <section
      ref={sectionRef}
      aria-labelledby={headingId}
      className='grid gap-2'
    >
      <h3 id={headingId} className='text-display-ui-6 text-strong'>
        Card fields
      </h3>
      {shown.length > 0 && (
        <Sortable
          items={shown}
          label='card fields'
          onReorder={(next) => write(next)}
        >
          <List aria-labelledby={headingId}>
            {shown.map((key) => {
              const field = byKey.get(key)!
              return (
                <List.Item
                  key={key}
                  value={key}
                  title={field.label}
                  trailing={toggle(field, true)}
                />
              )
            })}
          </List>
        </Sortable>
      )}
      {hidden.length > 0 && (
        <div className='grid gap-1'>
          <p id={hiddenId} className='text-sm text-subtle'>
            Hidden
          </p>
          <List
            aria-labelledby={hiddenId}
            className='[&_[data-slot=list-item-title]]:text-subtle'
          >
            {hidden.map((field) => (
              // A static row: List.Item would be a button around the toggle.
              <li key={field.key}>
                <div
                  data-slot='list-item'
                  className={cn(
                    listItemVariants({ interactive: false }),
                    'group-data-[contained=subtler]/list:bg-transparent group-data-[emphasis=subtler]/list:bg-transparent'
                  )}
                >
                  <ListItemContent
                    title={field.label}
                    trailing={toggle(field, false)}
                    chevron={false}
                  />
                </div>
              </li>
            ))}
          </List>
        </div>
      )}
      <span id={lastShownId} hidden>
        A card shows at least one field
      </span>
    </section>
  )
}
RecordGridSettings.displayName = 'RecordGridSettings'
