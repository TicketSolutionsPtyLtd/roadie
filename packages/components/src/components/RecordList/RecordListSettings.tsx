'use client'

import { useId } from 'react'

import { Field } from '../Field'
import { RecordGridSettingsLazy } from '../RecordGrid/RecordGridSettingsLazy'
import { useRecordsData } from '../Records/context'
import { groupableFields } from '../Records/groups'
import { Select } from '../Select'
import { listGroupFields, listGroupLevelsLayout } from './groupBy'
import type { ListLayoutConfig } from './types'

/** The list's part of `Records.Options`: its row fields, then what it groups by. */
export function RecordListSettings({ config }: { config: ListLayoutConfig }) {
  return (
    <>
      <RecordGridSettingsLazy config={config} type='list' />
      <RecordListGroupSettings />
    </>
  )
}
RecordListSettings.preload = RecordGridSettingsLazy.preload

const levelNames = ['Group by', 'Then by', 'And then by'] as const

function RecordListGroupSettings() {
  const records = useRecordsData()
  const headingId = useId()
  const { fields, view, range } = records
  const groupable = groupableFields(fields)
  // A range list stays ungrouped, so the setting would do nothing.
  if (range || groupable.length === 0) return null
  const levels = listGroupFields(fields, view.layout).map(({ key }) => key)
  const setLevel = (index: number, key: string | null) => {
    const next = key
      ? [...levels.slice(0, index), key, ...levels.slice(index + 1)].filter(
          (level, i, all) => all.indexOf(level) === i
        )
      : levels.slice(0, index)
    // A select whose field moved to a level above reports None as it clears,
    // which would write the view again unchanged.
    if (next.join() === levels.join()) return
    records.setLayout(listGroupLevelsLayout(view.layout, next))
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
