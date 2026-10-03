'use client'

import { lazy } from 'react'

import type { RecordsFilterEditorProps } from './RecordsFilterEditor'

type EditorModule = typeof import('./RecordsFilterEditor')

let loaded: EditorModule | undefined
const load = () =>
  import('./RecordsFilterEditor').then((module) => (loaded = module))

const Suspending = lazy(() =>
  load().then((module) => ({ default: module.RecordsFilterEditor }))
)

/**
 * A chip's editor, loaded on `preload` or first open, so the date pickers stay
 * out of the records' first load. Once loaded it renders at once.
 */
export function RecordsFilterEditorLazy(props: RecordsFilterEditorProps) {
  const Loaded = loaded?.RecordsFilterEditor
  return Loaded ? <Loaded {...props} /> : <Suspending {...props} />
}
// A failed load shows when an editor opens, through lazy itself.
RecordsFilterEditorLazy.preload = () =>
  load().then(
    () => {},
    () => {}
  )
