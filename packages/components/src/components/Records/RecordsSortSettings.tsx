'use client'

import { useId } from 'react'

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

/** The view's sort in `Records.Options`: a field and direction per level. */
export function RecordsSortSettings() {
  const { records } = useRecordsContext()
  const headingId = useId()
  const fields = sortableFields(records.fields)
  const byKey = new Map(fields.map((field) => [field.key, field]))
  // A level the fields can't sort is skipped, so it isn't offered either.
  const sort = records.view.query.sort.filter(({ field }) => byKey.has(field))
  const setLevel = (index: number, level: RecordSort) =>
    records.setSort(sort.map((current, at) => (at === index ? level : current)))
  const added = addSort(sort, fields)

  return (
    <section aria-labelledby={headingId} className='grid gap-2'>
      <h3 id={headingId} className='text-display-ui-6 text-strong'>
        Sort
      </h3>
      {sort.map((level, index) => {
        const field = byKey.get(level.field)!
        const taken = new Set(
          sort.filter((_, at) => at !== index).map(({ field }) => field)
        )
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
                  setLevel(index, {
                    field: next.key,
                    direction: firstDirection(next)
                  })
              }}
            >
              <Select.Trigger
                size='sm'
                aria-label={index === 0 ? 'Sort by' : 'Then by'}
              >
                <Select.Value />
                <Select.Icon />
              </Select.Trigger>
              <Select.Content>
                {fields
                  .filter(({ key }) => !taken.has(key))
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
                setLevel(index, {
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
              aria-label={`Remove sort by ${field.label}`}
              size='sm'
              emphasis='subtler'
              onClick={() =>
                records.setSort(sort.filter((_, at) => at !== index))
              }
            >
              <XIcon weight='bold' className='size-4' aria-hidden />
            </IconButton>
          </div>
        )
      })}
      {added.length > sort.length && (
        <Button
          size='sm'
          emphasis='subtler'
          className='justify-self-start'
          onClick={() => records.setSort(added)}
        >
          <PlusIcon weight='bold' className='size-4' aria-hidden />
          {sort.length === 0 ? 'Add sort' : 'Add another sort'}
        </Button>
      )}
    </section>
  )
}
