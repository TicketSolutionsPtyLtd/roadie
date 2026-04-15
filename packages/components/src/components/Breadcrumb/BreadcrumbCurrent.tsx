import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

export type BreadcrumbCurrentProps = ComponentProps<'span'>

export function BreadcrumbCurrent({
  className,
  ...props
}: BreadcrumbCurrentProps) {
  return (
    <span
      aria-current='page'
      data-slot='breadcrumb-current'
      className={cn('font-medium text-normal', className)}
      {...props}
    />
  )
}

BreadcrumbCurrent.displayName = 'Breadcrumb.Current'
