'use client'

import { RecordGridSettingsLazy } from '../RecordGrid/RecordGridSettingsLazy'
import { RecordsLayoutGroupSettings } from '../Records/RecordsGroupSettings'
import type { ListLayoutConfig } from './types'

/** The list's part of `Records.Options`: its row fields, then what it groups by. */
export function RecordListSettings({ config }: { config: ListLayoutConfig }) {
  return (
    <>
      <RecordGridSettingsLazy config={config} type='list' />
      <RecordsLayoutGroupSettings type='list' />
    </>
  )
}
RecordListSettings.preload = RecordGridSettingsLazy.preload
