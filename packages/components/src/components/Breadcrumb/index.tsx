import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

function BreadcrumbRoot({ className, ...props }: ComponentProps<'nav'>) {
  return <nav aria-label="Breadcrumb" className={className} {...props} />
}

BreadcrumbRoot.displayName = 'Breadcrumb'

function BreadcrumbList({ className, ...props }: ComponentProps<'ol'>) {
  return (
    <ol
      className={cn('flex items-center gap-2 text-sm', className)}
      {...props}
    />
  )
}

BreadcrumbList.displayName = 'Breadcrumb.List'

function BreadcrumbItem({ className, ...props }: ComponentProps<'li'>) {
  return (
    <li className={cn('flex items-center gap-2', className)} {...props} />
  )
}

BreadcrumbItem.displayName = 'Breadcrumb.Item'

function BreadcrumbLink({ className, ...props }: ComponentProps<'a'>) {
  return (
    <a
      className={cn(
        'emphasis-subtle-fg hover:emphasis-default-fg transition-colors',
        className
      )}
      {...props}
    />
  )
}

BreadcrumbLink.displayName = 'Breadcrumb.Link'

interface BreadcrumbSeparatorProps extends ComponentProps<'span'> {
  children?: React.ReactNode
}

function BreadcrumbSeparator({
  className,
  children = '/',
  ...props
}: BreadcrumbSeparatorProps) {
  return (
    <span
      role="presentation"
      className={cn('emphasis-subtler-fg', className)}
      {...props}
    >
      {children}
    </span>
  )
}

BreadcrumbSeparator.displayName = 'Breadcrumb.Separator'

function BreadcrumbCurrent({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      aria-current="page"
      className={cn('emphasis-default-fg font-medium', className)}
      {...props}
    />
  )
}

BreadcrumbCurrent.displayName = 'Breadcrumb.Current'

export const Breadcrumb = Object.assign(BreadcrumbRoot, {
  List: BreadcrumbList,
  Item: BreadcrumbItem,
  Link: BreadcrumbLink,
  Separator: BreadcrumbSeparator,
  Current: BreadcrumbCurrent
})

export type { BreadcrumbSeparatorProps }
