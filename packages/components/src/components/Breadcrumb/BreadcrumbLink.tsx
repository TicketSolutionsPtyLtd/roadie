import type { ComponentProps, ElementType } from 'react'

import { cn } from '@oztix/roadie-core/utils'

export type BreadcrumbLinkProps<T extends ElementType = 'a'> = {
  as?: T
  className?: string
} & Omit<ComponentProps<T>, 'as' | 'className'>

export function BreadcrumbLink<T extends ElementType = 'a'>({
  as,
  className,
  ...props
}: BreadcrumbLinkProps<T>) {
  const Component = as || 'a'
  return (
    <Component
      data-slot='breadcrumb-link'
      className={cn(
        'text-subtle transition-colors hover:text-normal',
        className
      )}
      {...props}
    />
  )
}

BreadcrumbLink.displayName = 'Breadcrumb.Link'
