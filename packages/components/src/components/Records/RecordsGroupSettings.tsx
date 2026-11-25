'use client'

import { useId } from 'react'

import { Field } from '../Field'
import { Select } from '../Select'
import { useRecordsData } from './context'
import { groupableFields } from './groups'

const levelNames = ['Group by', 'Then by', 'And then by'] as const

/**
 * A layout's Group by, Then by and And then by in `Records.Options`. `levels`
 * are the keys it groups by, outermost first; `onLevels` writes the next ones.
 */
export function RecordsGroupSettings({
  levels,
  onLevels
}: {
  levels: readonly string[]
  onLevels: (levels: string[]) => void
}) {
  const { fields, range } = useRecordsData()
  const headingId = useId()
  const groupable = groupableFields(fields)
  // Range-loaded records stay ungrouped, so the setting would do nothing.
  if (range || groupable.length === 0) return null
  const setLevel = (index: number, key: string | null) => {
    const next = key
      ? [...levels.slice(0, index), key, ...levels.slice(index + 1)].filter(
          (level, i, all) => all.indexOf(level) === i
        )
      : levels.slice(0, index)
    // A select whose field moved to a level above reports None as it clears,
    // which would write the view again unchanged.
    if (next.join() !== levels.join()) onLevels(next)
  }
  // A level appears once the one before it is picked.
  const shown = levelNames.slice(
    0,
    Math.min(levels.length + 1, groupable.length, levelNames.length)
  )
  return (
    <section aria-labelledby={headingId} className='grid gap-2'>
      <h3 id={headingId} className='text-display-ui-6 text-strong'>
        Group
      </h3>
      {shown.map((name, index) => (
        <Field key={name}>
          <Field.Label>{name}</Field.Label>
          <Select
            value={levels[index] ?? null}
            onValueChange={(key) => setLevel(index, key as string | null)}
          >
            <Select.Trigger size='sm'>
              <Select.Value placeholder='None' />
              <Select.Icon />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value={null}>None</Select.Item>
              {groupable
                .filter(({ key }) => !levels.slice(0, index).includes(key))
                .map(({ key, label }) => (
                  <Select.Item key={key} value={key}>
                    {label}
                  </Select.Item>
                ))}
            </Select.Content>
          </Select>
        </Field>
      ))}
    </section>
  )
}
RecordsGroupSettings.displayName = 'RecordsGroupSettings'
