'use client'

import { lazy } from 'react'

import type { GridLayoutConfig } from './types'

type SettingsModule = typeof import('./RecordGridSettings')

let loaded: SettingsModule | undefined
const load = () =>
  import('./RecordGridSettings').then((module) => (loaded = module))

const Suspending = lazy(() =>
  load().then((module) => ({ default: module.RecordGridSettings }))
)

/**
 * The grid's settings, loaded on `preload` or first open, so drag and drop
 * stays out of the grid's first load. Once loaded they render at once, as
 * the table's do.
 */
export function RecordGridSettingsLazy(props: { config: GridLayoutConfig }) {
  const Loaded = loaded?.RecordGridSettings
  return Loaded ? <Loaded {...props} /> : <Suspending {...props} />
}
// A failed load shows when the options open, through lazy itself.
RecordGridSettingsLazy.preload = () =>
  load().then(
    () => {},
    () => {}
  )
