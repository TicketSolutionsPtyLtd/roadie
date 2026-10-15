'use client'

import type {
  RecordsDatesPanelProps,
  RecordsFilterEditorProps
} from './RecordsFilterEditor'

type EditorModule = typeof import('./RecordsFilterEditor')

let loaded: EditorModule | undefined

/**
 * Custom dates' editor, loaded while the page is idle or as it opens, so the
 * date pickers stay out of the records' first load. It opens only once it has
 * loaded, so it never suspends and a failed load leaves the page working.
 */
export function RecordsFilterEditorLazy(props: RecordsFilterEditorProps) {
  const Loaded = loaded?.RecordsFilterEditor
  return Loaded ? <Loaded {...props} /> : null
}
/** Resolves true once the editor can show; a failed load can be tried again. */
RecordsFilterEditorLazy.preload = (): Promise<boolean> =>
  loaded
    ? Promise.resolve(true)
    : import('./RecordsFilterEditor').then(
        (module) => {
          loaded = module
          return true
        },
        () => false
      )

/** Prototype (INNO-1278): the calendar for the dropdown, from the same load. */
export function RecordsDatesPanelLazy(props: RecordsDatesPanelProps) {
  const Loaded = loaded?.RecordsDatesPanel
  return Loaded ? <Loaded {...props} /> : null
}
