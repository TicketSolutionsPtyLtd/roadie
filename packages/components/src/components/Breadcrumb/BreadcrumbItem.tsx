import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

export type BreadcrumbItemProps = ComponentProps<'li'>

export function BreadcrumbItem({ className, ...props }: BreadcrumbItemProps) {
  return (
    <li
      data-slot='breadcrumb-item'
      className={cn('flex items-center gap-2', className)}
      {...props}
    />
  )
}

BreadcrumbItem.displayName = 'Breadcrumb.Item'
