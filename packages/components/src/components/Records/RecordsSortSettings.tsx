'use client'

import { useId, useLayoutEffect, useRef } from 'react'

import { PlusIcon, XIcon } from '@phosphor-icons/react'

import type {
  RecordSort,
  RecordSortDirection
} from '@oztix/roadie-core/records'

import { Button, IconButton } from '../Button'
import { Select } from '../Select'
import { useRecordsContext } from './context'
import {
  addSort,
  firstDirection,
  sortDirectionLabel,
  sortableFields
} from './sortOptions'

const DIRECTIONS: RecordSortDirection[] = ['ascending', 'descending']

// By content: a parent may rebuild an unchanged view on every render.
const sameSort = (a: readonly RecordSort[], b: readonly RecordSort[]) =>
  a.length === b.length &&
  a.every(
    (level, index) =>
      level.field === b[index]!.field && level.direction === b[index]!.direction
  )

type Focus = { part: 'field' | 'remove'; level: number } | { part: 'add' }

/** The view's sort in `Records.Options`: a field and direction per level. */
export function RecordsSortSettings() {
  const { records } = useRecordsContext()
  const headingId = useId()
  const sectionRef = useRef<HTMLElement>(null)
  // Where focus goes once the change shows, as the control used may be gone.
  const focusNext = useRef<{
    focus: Focus
    from: readonly RecordSort[]
  } | null>(null)
  const fields = sortableFields(records.fields)
  const byKey = new Map(fields.map((field) => [field.key, field]))
  // A repeated field sorts nothing more, so edits drop it.
  const sort = records.view.query.sort.filter(
    (level, at, all) =>
      all.findIndex(({ field }) => field === level.field) === at
  )
  // Levels the fields can't sort aren't shown, and edits keep them in place.
  const levels = sort.flatMap((level, at) =>
    byKey.has(level.field) ? [{ level, at }] : []
  )
  const shown = new Set(levels.map(({ level }) => level.field))
  const change = (next: RecordSort[], focus?: Focus) => {
    focusNext.current = focus ? { focus, from: records.view.query.sort } : null
    records.setSort(next)
  }
  const setLevel = (at: number, level: RecordSort) =>
    change(sort.map((current, index) => (index === at ? level : current)))
  const added = addSort(
    levels.map(({ level }) => level),
    fields
  )[levels.length]

  useLayoutEffect(() => {
    const pending = focusNext.current
    const section = sectionRef.current
    // Until the sort changes, the control used is still there.
    if (!pending || !section || sameSort(pending.from, records.view.query.sort))
      return
    focusNext.current = null
    const { focus } = pending
    const scope =
      focus.part === 'add'
        ? section
        : section.querySelectorAll('[data-slot="records-sort-level"]')[
            focus.level
          ]
    scope
      ?.querySelector<HTMLElement>(`[data-sort-part="${focus.part}"]`)
      ?.focus()
  })

  return (
    <section
      ref={sectionRef}
      aria-labelledby={headingId}
      className='grid gap-2'
    >
      <h3 id={headingId} className='text-display-ui-6 text-strong'>
        Sort
      </h3>
      {levels.map(({ level, at }, index) => {
        const field = byKey.get(level.field)!
        return (
          <div
            key={index}
            data-slot='records-sort-level'
            className='grid grid-cols-[minmax(0,1fr)_minmax(0,9rem)_auto] items-center gap-2'
          >
            <Select
              value={level.field}
              onValueChange={(key) => {
                const next = byKey.get(key as string)
                if (next)
                  setLevel(at, {
                    field: next.key,
                    direction: firstDirection(next)
                  })
              }}
            >
              <Select.Trigger
                data-sort-part='field'
                size='sm'
                aria-label={
                  index === 0 ? 'Sort by' : `Then by, level ${index + 1}`
                }
              >
                <Select.Value />
                <Select.Icon />
              </Select.Trigger>
              <Select.Content>
                {fields
                  .filter(({ key }) => key === level.field || !shown.has(key))
                  .map(({ key, label }) => (
                    <Select.Item key={key} value={key}>
                      {label}
                    </Select.Item>
                  ))}
              </Select.Content>
            </Select>
            <Select
              value={level.direction}
              onValueChange={(direction) =>
                setLevel(at, {
                  ...level,
                  direction: direction as RecordSortDirection
                })
              }
            >
              <Select.Trigger size='sm' aria-label={`${field.label} order`}>
                <Select.Value />
                <Select.Icon />
              </Select.Trigger>
              <Select.Content>
                {DIRECTIONS.map((direction) => (
                  <Select.Item key={direction} value={direction}>
                    {sortDirectionLabel(field, direction)}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
            <IconButton
              data-sort-part='remove'
              aria-label={`Remove sort by ${field.label}`}
              size='sm'
              emphasis='subtler'
              onClick={() => {
                const left = levels.length - 1
                change(
                  sort.filter((_, other) => other !== at),
                  left > 0
                    ? { part: 'remove', level: Math.min(index, left - 1) }
                    : { part: 'add' }
                )
              }}
            >
              <XIcon weight='bold' className='size-4' aria-hidden />
            </IconButton>
          </div>
        )
      })}
      {added && (
        <Button
          data-sort-part='add'
          size='sm'
          emphasis='subtler'
          className='justify-self-start'
          onClick={() =>
            change([...sort, added], { part: 'field', level: levels.length })
          }
        >
          <PlusIcon weight='bold' className='size-4' aria-hidden />
          {levels.length === 0 ? 'Add sort' : 'Add another sort'}
        </Button>
      )}
    </section>
  )
}
