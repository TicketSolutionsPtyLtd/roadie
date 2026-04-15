import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

export type BreadcrumbListProps = ComponentProps<'ol'>

export function BreadcrumbList({ className, ...props }: BreadcrumbListProps) {
  return (
    <ol
      data-slot='breadcrumb-list'
      className={cn('flex items-center gap-2 text-sm', className)}
      {...props}
    />
  )
}

BreadcrumbList.displayName = 'Breadcrumb.List'
