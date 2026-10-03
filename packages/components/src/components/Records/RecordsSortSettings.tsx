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

type Focus = { part: 'field' | 'remove'; level: number } | { part: 'add' }

/** The view's sort in `Records.Options`: a field and direction per level. */
export function RecordsSortSettings() {
  const { records } = useRecordsContext()
  const headingId = useId()
  const sectionRef = useRef<HTMLElement>(null)
  // Where focus goes once a change renders, as the control used may be gone.
  const focusNext = useRef<Focus | null>(null)
  const fields = sortableFields(records.fields)
  const byKey = new Map(fields.map((field) => [field.key, field]))
  const sort = records.view.query.sort
  // Levels the fields can't sort, or that repeat a field, sort nothing, so
  // they aren't shown; edits keep them in place.
  const seen = new Set<string>()
  const levels = sort.flatMap((level, at) => {
    if (!byKey.has(level.field) || seen.has(level.field)) return []
    seen.add(level.field)
    return [{ level, at }]
  })
  const setLevel = (at: number, level: RecordSort) =>
    records.setSort(
      sort.map((current, index) => (index === at ? level : current))
    )
  const added = addSort(
    levels.map(({ level }) => level),
    fields
  )[levels.length]

  useLayoutEffect(() => {
    const focus = focusNext.current
    const section = sectionRef.current
    if (!focus || !section) return
    focusNext.current = null
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
                  .filter(({ key }) => key === level.field || !seen.has(key))
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
                focusNext.current =
                  left > 0
                    ? { part: 'remove', level: Math.min(index, left - 1) }
                    : { part: 'add' }
                records.setSort(sort.filter((_, other) => other !== at))
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
          onClick={() => {
            focusNext.current = { part: 'field', level: levels.length }
            records.setSort([...sort, added])
          }}
        >
          <PlusIcon weight='bold' className='size-4' aria-hidden />
          {levels.length === 0 ? 'Add sort' : 'Add another sort'}
        </Button>
      )}
    </section>
  )
}
