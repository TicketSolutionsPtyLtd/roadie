'use client'

import { useId } from 'react'

import { RecordGridSettingsLazy } from '../RecordGrid/RecordGridSettingsLazy'
import { useRecordsContext } from '../Records/context'
import { groupableFields } from '../Records/groups'
import { Select } from '../Select'
import { listGroupField, listGroupLayout } from './groupBy'
import type { ListLayoutConfig } from './types'

/** The list's part of `Records.Options`: its row fields, then what it groups by. */
export function RecordListSettings({ config }: { config: ListLayoutConfig }) {
  return (
    <>
      <RecordGridSettingsLazy config={config} type='list' />
      <RecordListGroupSettings config={config} />
    </>
  )
}
RecordListSettings.preload = RecordGridSettingsLazy.preload

function RecordListGroupSettings({ config }: { config: ListLayoutConfig }) {
  const { records } = useRecordsContext()
  const headingId = useId()
  const { fields, view } = records
  const groupable = groupableFields(fields)
  if (groupable.length === 0) return null
  const current = listGroupField(config, fields, view.layout)
  // A view can't save "ungrouped" apart from a definition that groups.
  const ungroupable =
    listGroupField(config, fields, { type: 'list' }) === undefined
  return (
    <section aria-labelledby={headingId} className='grid gap-2'>
      <h3 id={headingId} className='text-display-ui-6 text-strong'>
        Group
      </h3>
      <Select
        value={current?.key ?? null}
        onValueChange={(key) =>
          records.setLayout(
            listGroupLayout(
              config,
              view.layout,
              (key as string | null) ?? undefined
            )
          )
        }
      >
        <Select.Trigger size='sm' aria-label='Group by'>
          <Select.Value placeholder='None' />
          <Select.Icon />
        </Select.Trigger>
        <Select.Content>
          {ungroupable && <Select.Item value={null}>None</Select.Item>}
          {groupable.map(({ key, label }) => (
            <Select.Item key={key} value={key}>
              {label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select>
    </section>
  )
}
