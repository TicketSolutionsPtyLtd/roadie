'use client'

import { lazy } from 'react'

const load = () => import('./RecordTableSettings')

/** Loads on first open, or on `preload`, so a table nobody configures skips drag and drop. */
export const RecordTableSettingsLazy = Object.assign(
  lazy(() =>
    load().then((module) => ({ default: module.RecordTableSettings }))
  ),
  {
    // A failed load shows when the options open, through lazy itself.
    preload: () => void load().catch(() => {})
  }
)
