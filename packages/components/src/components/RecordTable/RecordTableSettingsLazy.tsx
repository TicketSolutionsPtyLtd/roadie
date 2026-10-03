'use client'

import { lazy } from 'react'

import type { TableLayoutConfig } from './tableLayout'

type SettingsModule = typeof import('./RecordTableSettings')

let loaded: SettingsModule | undefined
const load = () =>
  import('./RecordTableSettings').then((module) => (loaded = module))

const Suspending = lazy(() =>
  load().then((module) => ({ default: module.RecordTableSettings }))
)

/**
 * The table's settings, loaded on `preload` or first open, so drag and drop
 * stays out of the table's first load. Once loaded they render at once:
 * suspending again would cost a second commit on a large page.
 */
export function RecordTableSettingsLazy(props: { config: TableLayoutConfig }) {
  const Loaded = loaded?.RecordTableSettings
  return Loaded ? <Loaded {...props} /> : <Suspending {...props} />
}
// A failed load shows when the options open, through lazy itself.
RecordTableSettingsLazy.preload = () =>
  load().then(
    () => {},
    () => {}
  )
