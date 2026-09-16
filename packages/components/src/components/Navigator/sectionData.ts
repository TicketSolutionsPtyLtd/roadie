import { type ReactElement, type ReactNode, isValidElement } from 'react'

import type { BadgeProps } from '../Badge'
import { type NavigatorActiveSection, isActiveValue } from './NavigatorContext'
import { secondaryBlocks, splitItemChildren } from './splitSecondary'

export type NavigatorSectionItem = {
  value: string
  label: ReactNode
  href?: string
  icon?: ReactElement
  description?: string
  badge?: ReactElement<BadgeProps>
  /** The item is the active `value`. */
  current: boolean
}

export type NavigatorSectionGroup = {
  /** The `Navigator.GroupTitle`; absent for loose items and untitled groups. */
  title?: ReactNode
  items: NavigatorSectionItem[]
}

export type NavigatorSectionData = {
  value: string
  label: ReactNode
  href?: string
  groups: NavigatorSectionGroup[]
}

export type SectionRow = Omit<NavigatorSectionItem, 'icon'> & {
  icon?: ReactNode
}

export type SectionRowGroup = {
  kind: 'group' | 'loose'
  title?: ReactNode
  rows: SectionRow[]
}

export function sectionRows(
  section: NavigatorActiveSection,
  activeValue: string | undefined
): SectionRowGroup[] {
  return secondaryBlocks(section.secondary.children).map((block) => ({
    kind: block.kind,
    title: block.title ?? undefined,
    rows: block.items.map(({ props }) => ({
      value: props.value,
      label: splitItemChildren(props.children).label,
      href: props.href,
      icon: props.icon,
      description: props.description,
      badge: props.badge,
      current: isActiveValue(props.value, activeValue)
    }))
  }))
}

export function toSectionData(
  section: NavigatorActiveSection,
  activeValue: string | undefined
): NavigatorSectionData {
  return {
    value: section.value,
    label: section.label,
    href: section.href,
    groups: sectionRows(section, activeValue).map((group) => ({
      title: group.title,
      items: group.rows.map((row) => ({
        ...row,
        icon: isValidElement(row.icon) ? row.icon : undefined
      }))
    }))
  }
}
