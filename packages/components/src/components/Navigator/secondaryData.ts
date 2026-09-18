import { type ReactElement, type ReactNode, isValidElement } from 'react'

import type { BadgeProps } from '../Badge'
import {
  type NavigatorActiveSecondary,
  isActiveValue
} from './NavigatorContext'
import { secondaryBlocks, splitItemChildren } from './splitSecondary'

export type NavigatorSecondaryItem = {
  value: string
  label: ReactNode
  href?: string
  icon?: ReactElement
  description?: string
  badge?: ReactElement<BadgeProps>
  /** The item is the active `value`. */
  current: boolean
}

export type NavigatorSecondaryGroup = {
  /** The `Navigator.GroupTitle`; absent for loose items and untitled groups. */
  title?: ReactNode
  items: NavigatorSecondaryItem[]
}

export type NavigatorSecondaryData = {
  value: string
  label: ReactNode
  href?: string
  groups: NavigatorSecondaryGroup[]
}

export type SecondaryRow = Omit<NavigatorSecondaryItem, 'icon'> & {
  icon?: ReactNode
}

export type SecondaryRowGroup = {
  kind: 'group' | 'loose'
  title?: ReactNode
  rows: SecondaryRow[]
}

export function secondaryRows(
  secondary: NavigatorActiveSecondary,
  activeValue: string | undefined
): SecondaryRowGroup[] {
  return secondaryBlocks(secondary.props.children).map((block) => ({
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

export function toSecondaryData(
  secondary: NavigatorActiveSecondary,
  activeValue: string | undefined
): NavigatorSecondaryData {
  return {
    value: secondary.value,
    label: secondary.label,
    href: secondary.href,
    groups: secondaryRows(secondary, activeValue).map((group) => ({
      title: group.title,
      items: group.rows.map((row) => ({
        ...row,
        icon: isValidElement(row.icon) ? row.icon : undefined
      }))
    }))
  }
}
