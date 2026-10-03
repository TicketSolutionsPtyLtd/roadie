'use client'

import { useEffect } from 'react'

import { isDev } from '../../utils/isDev'
import { useRecordsContext } from './context'
import type { RecordsContentProps } from './layouts'

let warnedNoLayout = false

/** Shows the records in the layout the view names, or the first one given. */
export function RecordsContent(props: RecordsContentProps) {
  const { records, layouts } = useRecordsContext()
  const layout =
    layouts.find(({ type }) => type === records.view.layout.type) ?? layouts[0]
  useEffect(() => {
    if (layout || warnedNoLayout || !isDev()) return
    warnedNoLayout = true
    console.warn(
      '[Roadie] Records.Content has no layout to show. Pass layouts to Records.Root, such as [tableLayout(columns)].'
    )
  }, [layout])
  if (!layout) return null
  return <layout.Content {...props} layout={layout} />
}
RecordsContent.displayName = 'Records.Content'
