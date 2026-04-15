import type { ComponentProps, ElementType, ReactNode } from 'react'

import { cn } from '@oztix/roadie-core/utils'

export function Breadcrumb({ className, ...props }: ComponentProps<'nav'>) {
  return (
    <nav
      aria-label='Breadcrumb'
      data-slot='breadcrumb'
      className={className}
      {...props}
    />
  )
}

Breadcrumb.displayName = 'Breadcrumb'

export function BreadcrumbList({ className, ...props }: ComponentProps<'ol'>) {
  return (
    <ol
      data-slot='breadcrumb-list'
      className={cn('flex items-center gap-2 text-sm', className)}
      {...props}
    />
  )
}

BreadcrumbList.displayName = 'Breadcrumb.List'

export function BreadcrumbItem({ className, ...props }: ComponentProps<'li'>) {
  return (
    <li
      data-slot='breadcrumb-item'
      className={cn('flex items-center gap-2', className)}
      {...props}
    />
  )
}

BreadcrumbItem.displayName = 'Breadcrumb.Item'

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
      className={cn('text-subtler', className)}
      {...props}
    >
      {children}
    </span>
  )
}

BreadcrumbSeparator.displayName = 'Breadcrumb.Separator'

export function BreadcrumbCurrent({
  className,
  ...props
}: ComponentProps<'span'>) {
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

Breadcrumb.List = BreadcrumbList
Breadcrumb.Item = BreadcrumbItem
Breadcrumb.Link = BreadcrumbLink
Breadcrumb.Separator = BreadcrumbSeparator
Breadcrumb.Current = BreadcrumbCurrent
