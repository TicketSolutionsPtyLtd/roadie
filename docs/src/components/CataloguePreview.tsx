import type { ReactNode } from 'react'

import type { CatalogueEntry } from '@/lib/page-manifest'

import { ChartPreview } from './ChartPreview'
import { ComponentSkeleton, Skel } from './ComponentSkeleton'
import { FoundationPreview } from './FoundationPreview'

const ART_BY_ROUTE: Record<string, (props: { name: string }) => ReactNode> = {
  '/components': ComponentSkeleton,
  '/foundations': FoundationPreview,
  '/charts': ChartPreview
}

/** A page's art from the catalogue that owns it, or null when it has none. */
export function previewArt(
  route: string,
  entry: Pick<CatalogueEntry, 'name' | 'crossListedFrom'>
): ReactNode {
  // Called rather than rendered, so an unknown name is visible here as null.
  return (
    ART_BY_ROUTE[entry.crossListedFrom ?? route]?.({ name: entry.name }) ?? null
  )
}

function PreviewFallback() {
  return (
    <div className='grid w-40 gap-1.5'>
      <Skel className='h-2 w-20' />
      <Skel className='h-2 w-full' />
      <Skel className='h-2 w-16' />
    </div>
  )
}

/** A catalogue entry's preview art, drawn by the catalogue the page comes from. */
export function CataloguePreview({
  route,
  entry
}: {
  route: string
  entry: Pick<CatalogueEntry, 'name' | 'crossListedFrom'>
}) {
  return previewArt(route, entry) ?? <PreviewFallback />
}
