'use client'

import { Suspense, useEffect, useLayoutEffect, useRef } from 'react'

import type { RecordLayout } from '@oztix/roadie-core/records'

import { RecordsLayoutSettings } from './RecordsLayoutSettings'
import { RecordsSortSettings } from './RecordsSortSettings'
import { activeLayout, useRecordsContext } from './context'
import { whenIdle } from './idle'
import { sortableFields } from './sortOptions'

/**
 * What `Records.View` and `Records.Options` hold: the layout switch, the sort,
 * and the shown layout's own settings. `settings` is null when there is
 * nothing to set.
 */
export function useViewSettings() {
  const { records, layouts } = useRecordsContext()
  const layout = activeLayout(layouts, records.view)
  const Settings = layout?.Settings
  // Lazy layouts' settings load once the page is idle, or as the button is
  // reached, so the first open doesn't wait for them and the page's first
  // load doesn't carry them. Every layout's, so a switch shows its settings
  // at once. Once per mount: a layout built in render makes a new `preload`
  // each time.
  const preload = useRef(() => {})
  useEffect(() => {
    preload.current = () => {
      for (const each of layouts) each.Settings?.preload?.()
    }
  })
  useEffect(() => whenIdle(() => preload.current()), [])
  const preloadNow = () => preload.current()
  // Each layout's settings as last shown in the open view, so switching
  // back keeps them; another view starts afresh.
  const shownLayouts = useRef({
    baseline: '',
    layouts: new Map<string, RecordLayout>()
  })
  const { layout: viewLayout } = records.view
  // By id, so saving or renaming the open view keeps them.
  const { baseline: opened } = records
  const baselineKey = opened ? (opened.id ?? JSON.stringify(opened)) : ''
  useLayoutEffect(() => {
    const memory = shownLayouts.current
    if (memory.baseline !== baselineKey)
      shownLayouts.current = { baseline: baselineKey, layouts: new Map() }
    shownLayouts.current.layouts.set(viewLayout.type, viewLayout)
  }, [viewLayout, baselineKey])
  const switchLayout = (type: RecordLayout['type']) => {
    const { baseline } = records
    records.setLayout(
      shownLayouts.current.layouts.get(type) ??
        (baseline?.layout.type === type
          ? baseline.layout
          : ({ type } as RecordLayout))
    )
  }
  const switches = new Set(layouts.map(({ type }) => type)).size > 1
  const sorts = sortableFields(records.fields).length > 0

  const settings =
    sorts || Settings || switches ? (
      <div data-slot='records-options' className='grid gap-6'>
        {switches && layout && (
          <RecordsLayoutSettings shown={layout} onChange={switchLayout} />
        )}
        {sorts && <RecordsSortSettings />}
        {Settings && layout && (
          // A layout may load its settings on first open, as the table does.
          <Suspense fallback={null}>
            <Settings config={layout.config as never} />
          </Suspense>
        )}
      </div>
    ) : null

  return { layout, preloadNow, settings }
}
