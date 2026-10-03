'use client'

import { useEffect } from 'react'

import { isDev } from '../../utils/isDev'
import { activeLayout, useRecordsContext } from './context'
import type { RecordsContentProps } from './layouts'

let warnedNoLayout = false

/** Shows the records in the layout the view names, or the first one given. */
export function RecordsContent(props: RecordsContentProps) {
  const { records, layouts } = useRecordsContext()
  const layout = activeLayout(layouts, records.view)
  useEffect(() => {
    if (layout || warnedNoLayout || !isDev()) return
    warnedNoLayout = true
    console.warn(
      '[Roadie] Records.Content has no layout to show. Pass layouts to Records.Root, such as [tableLayout(columns)].'
    )
  }, [layout])
  if (!layout) return null
  // Each definition pairs its Content with its own config.
  return <layout.Content {...props} config={layout.config as never} />
}
RecordsContent.displayName = 'Records.Content'
