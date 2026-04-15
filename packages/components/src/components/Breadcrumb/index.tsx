// Subpath entry for `@oztix/roadie-components/breadcrumb`.
//
// NO `'use client'` — server-safe property-assignment layer.
// See docs/contributing/COMPOUND_PATTERNS.md.
import { BreadcrumbCurrent } from './BreadcrumbCurrent'
import { BreadcrumbItem } from './BreadcrumbItem'
import { BreadcrumbLink } from './BreadcrumbLink'
import { BreadcrumbList } from './BreadcrumbList'
import { BreadcrumbRoot } from './BreadcrumbRoot'
import { BreadcrumbSeparator } from './BreadcrumbSeparator'

const Breadcrumb = BreadcrumbRoot as typeof BreadcrumbRoot & {
  Root: typeof BreadcrumbRoot
  List: typeof BreadcrumbList
  Item: typeof BreadcrumbItem
  Link: typeof BreadcrumbLink
  Separator: typeof BreadcrumbSeparator
  Current: typeof BreadcrumbCurrent
}

Breadcrumb.Root = BreadcrumbRoot
Breadcrumb.List = BreadcrumbList
Breadcrumb.Item = BreadcrumbItem
Breadcrumb.Link = BreadcrumbLink
Breadcrumb.Separator = BreadcrumbSeparator
Breadcrumb.Current = BreadcrumbCurrent

export { Breadcrumb }
export type { BreadcrumbRootProps as BreadcrumbProps } from './BreadcrumbRoot'
export type { BreadcrumbListProps } from './BreadcrumbList'
export type { BreadcrumbItemProps } from './BreadcrumbItem'
export type { BreadcrumbLinkProps } from './BreadcrumbLink'
export type { BreadcrumbSeparatorProps } from './BreadcrumbSeparator'
export type { BreadcrumbCurrentProps } from './BreadcrumbCurrent'
