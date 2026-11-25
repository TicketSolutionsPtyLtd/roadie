'use client'

import { RecordGridSettingsLazy } from '../RecordGrid/RecordGridSettingsLazy'
import { RecordsGroupSettings } from '../Records/RecordsGroupSettings'
import { useRecordsData } from '../Records/context'
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

function RecordListGroupSettings() {
  const { fields, view, setLayout } = useRecordsData()
  return (
    <RecordsGroupSettings
      levels={listGroupFields(fields, view.layout).map(({ key }) => key)}
      onLevels={(levels) =>
        setLayout(listGroupLevelsLayout(view.layout, levels))
      }
    />
  )
}
