import type { ComponentProps } from 'react'

export type BreadcrumbRootProps = ComponentProps<'nav'>

export function BreadcrumbRoot({ className, ...props }: BreadcrumbRootProps) {
  return (
    <nav
      aria-label='Breadcrumb'
      data-slot='breadcrumb'
      className={className}
      {...props}
    />
  )
}

BreadcrumbRoot.displayName = 'Breadcrumb.Root'
