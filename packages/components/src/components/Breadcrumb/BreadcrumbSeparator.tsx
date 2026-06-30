import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@oztix/roadie-core/utils'

export type BreadcrumbSeparatorProps = ComponentProps<'span'> & {
  children?: ReactNode
}

export function BreadcrumbSeparator({
  className,
  children = '/',
  ...props
}: BreadcrumbSeparatorProps) {
  return (
    <span
      role='presentation'
      data-slot='breadcrumb-separator'
      className={cn('shrink-0 text-subtler', className)}
      {...props}
    >
      {children}
    </span>
  )
}

BreadcrumbSeparator.displayName = 'Breadcrumb.Separator'
