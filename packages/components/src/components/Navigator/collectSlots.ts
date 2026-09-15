import {
  Children,
  type ReactElement,
  type ReactNode,
  isValidElement
} from 'react'

import { NavigatorBrand } from './NavigatorBrand'
import { NavigatorExpandToggle } from './NavigatorExpandToggle'
import { NavigatorGroup, type NavigatorGroupProps } from './NavigatorGroup'
import { NavigatorGroupTitle } from './NavigatorGroupTitle'
import { NavigatorItem, type NavigatorItemProps } from './NavigatorItem'
import type { NavigatorSecondaryProps } from './NavigatorSecondary'
import type { NavigatorSlotGroup, NavigatorSlotMeta } from './mobileSlots'
import {
  firstRoutedSecondary,
  secondaryDescendantValues,
  splitItemChildren
} from './splitSecondary'

export type PrimaryEntry =
  | {
      kind: 'item'
      element: ReactElement<NavigatorItemProps>
      slot: NavigatorSlotMeta
    }
  | {
      kind: 'group'
      element: ReactElement<NavigatorGroupProps>
      group: NavigatorSlotGroup
      slots: NavigatorSlotMeta[]
    }

export type CollectedSlots = {
  brand: ReactElement[]
  toggles: ReactElement[]
  cluster: PrimaryEntry[]
  pinned: PrimaryEntry[]
  automatic: NavigatorSlotMeta[]
  pinnedSlots: NavigatorSlotMeta[]
  /** Every slot in document order, for lookups that take the first match. */
  ordered: NavigatorSlotMeta[]
  hasStrayChild: boolean
}

export function toSlotMeta(
  props: NavigatorItemProps,
  group?: NavigatorSlotGroup
): NavigatorSlotMeta {
  const {
    label,
    secondary,
    menu: declaredMenu
  } = splitItemChildren(props.children)
  // A Secondary outranks a Menu; NavigatorItem ignores the Menu the same way.
  const menu = secondary.length > 0 ? undefined : declaredMenu
  const landing = firstRoutedSecondary(secondary)
  const href = menu ? undefined : (props.href ?? landing?.href)
  return {
    value: props.value,
    label,
    icon: props.icon,
    badge: props.badge,
    href,
    declaredHref: props.href,
    menu,
    topValue:
      props.href !== undefined ? props.value : (landing?.value ?? props.value),
    descendants: secondaryDescendantValues(secondary),
    secondary: isValidElement<NavigatorSecondaryProps>(secondary[0])
      ? secondary[0].props
      : undefined,
    group,
    onClick: props.onClick,
    placement: group?.placement ?? props.placement ?? 'automatic',
    priority: props.visibilityPriority ?? group?.priority ?? 'automatic'
  }
}

function groupSlots(element: ReactElement<NavigatorGroupProps>, key: string) {
  const group: NavigatorSlotGroup = {
    key,
    placement: element.props.placement ?? 'automatic',
    priority: element.props.visibilityPriority
  }
  const slots: NavigatorSlotMeta[] = []
  Children.forEach(element.props.children, (child) => {
    if (!isValidElement(child)) return
    if (child.type === NavigatorGroupTitle) {
      group.title = (child.props as { children?: ReactNode }).children
    } else if (child.type === NavigatorItem) {
      slots.push(toSlotMeta(child.props as NavigatorItemProps, group))
    }
  })
  return { group, slots }
}

// Matches by element type, one level into Group — see COMPOUND_PATTERNS.md §1.2.
export function collectSlots(children: ReactNode): CollectedSlots {
  const result: CollectedSlots = {
    brand: [],
    toggles: [],
    cluster: [],
    pinned: [],
    automatic: [],
    pinnedSlots: [],
    ordered: [],
    hasStrayChild: false
  }
  let groupCount = 0

  const place = (entry: PrimaryEntry, slots: NavigatorSlotMeta[]) => {
    const pinned = slots[0]?.placement === 'pinned'
    ;(pinned ? result.pinned : result.cluster).push(entry)
    ;(pinned ? result.pinnedSlots : result.automatic).push(...slots)
    result.ordered.push(...slots)
  }

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return
    if (child.type === NavigatorBrand) {
      result.brand.push(child)
      return
    }
    if (child.type === NavigatorItem) {
      const element = child as ReactElement<NavigatorItemProps>
      const slot = toSlotMeta(element.props)
      place({ kind: 'item', element, slot }, [slot])
      return
    }
    if (child.type === NavigatorExpandToggle) {
      result.toggles.push(child)
      return
    }
    if (child.type === NavigatorGroup) {
      const element = child as ReactElement<NavigatorGroupProps>
      const { group, slots } = groupSlots(element, `group-${groupCount++}`)
      if (slots.length > 0) {
        place({ kind: 'group', element, group, slots }, slots)
      }
      return
    }
    result.hasStrayChild = true
  })

  return result
}
