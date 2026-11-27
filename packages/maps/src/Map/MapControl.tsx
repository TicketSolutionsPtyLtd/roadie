'use client'

import type { ReactNode } from 'react'

import { toolbarSurfaceVariants } from '@oztix/roadie-components/toolbar'
import { cn } from '@oztix/roadie-core/utils'

/**
 * One control on its own over the map, such as full screen, on the same
 * surface as the zoom buttons' toolbar so they line up.
 */
export function MapControl({ children }: { children: ReactNode }) {
  return (
    <div
      data-slot='map-control'
      className={cn(toolbarSurfaceVariants(), 'p-1')}
    >
      {children}
    </div>
  )
}
