import {
  Children,
  type ReactElement,
  type ReactNode,
  isValidElement
} from 'react'

import { NavigatorBrand } from './NavigatorBrand'
import {
  NavigatorExpandToggle,
  type NavigatorExpandToggleProps
} from './NavigatorExpandToggle'
import { NavigatorGroup, type NavigatorGroupProps } from './NavigatorGroup'
import { NavigatorGroupTitle } from './NavigatorGroupTitle'
import { NavigatorItem, type NavigatorItemProps } from './NavigatorItem'
import type { NavigatorSlotGroup, NavigatorSlotMeta } from './mobileSlots'
import {
  firstSecondaryHref,
  firstSecondaryValue,
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
  | { kind: 'toggle'; element: ReactElement<NavigatorExpandToggleProps> }

export type CollectedSlots = {
  brand: ReactElement[]
  cluster: PrimaryEntry[]
  pinned: PrimaryEntry[]
  automatic: NavigatorSlotMeta[]
  pinnedSlots: NavigatorSlotMeta[]
  hasStrayChild: boolean
  conflictingPlacement: string[]
  pinnedBeforeCluster: boolean
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
  const href = menu ? undefined : (props.href ?? firstSecondaryHref(secondary))
  return {
    value: props.value,
    label,
    icon: props.icon,
    href,
    declaredHref: props.href,
    menu,
    topValue:
      props.href !== undefined
        ? props.value
        : (firstSecondaryValue(secondary) ?? props.value),
    descendants: secondaryDescendantValues(secondary),
    group,
    placement: group?.placement ?? props.placement ?? 'automatic',
    priority: props.visibilityPriority ?? group?.priority ?? 'automatic'
  }
}

// Matches by element type, one level into Group — see COMPOUND_PATTERNS.md §1.2.
export function collectSlots(children: ReactNode): CollectedSlots {
  const result: CollectedSlots = {
    brand: [],
    cluster: [],
    pinned: [],
    automatic: [],
    pinnedSlots: [],
    hasStrayChild: false,
    conflictingPlacement: [],
    pinnedBeforeCluster: false
  }
  let groupCount = 0

  const place = (
    entry: PrimaryEntry,
    slots: NavigatorSlotMeta[],
    pinned = slots[0]?.placement === 'pinned'
  ) => {
    if (!pinned && result.pinned.length > 0) result.pinnedBeforeCluster = true
    ;(pinned ? result.pinned : result.cluster).push(entry)
    ;(pinned ? result.pinnedSlots : result.automatic).push(...slots)
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
      const element = child as ReactElement<NavigatorExpandToggleProps>
      place(
        { kind: 'toggle', element },
        [],
        element.props.placement === 'pinned'
      )
      return
    }
    if (child.type === NavigatorGroup) {
      const element = child as ReactElement<NavigatorGroupProps>
      const group: NavigatorSlotGroup = {
        key: `group-${groupCount++}`,
        placement: element.props.placement ?? 'automatic',
        priority: element.props.visibilityPriority
      }
      const slots: NavigatorSlotMeta[] = []
      Children.forEach(element.props.children, (grandChild) => {
        if (!isValidElement(grandChild)) return
        if (grandChild.type === NavigatorGroupTitle) {
          group.title = (grandChild.props as { children?: ReactNode }).children
        } else if (grandChild.type === NavigatorItem) {
          const itemProps = grandChild.props as NavigatorItemProps
          if (
            itemProps.placement !== undefined &&
            itemProps.placement !== group.placement
          ) {
            result.conflictingPlacement.push(itemProps.value)
          }
          slots.push(toSlotMeta(itemProps, group))
        }
      })
      if (slots.length > 0) {
        place({ kind: 'group', element, group, slots }, slots)
      }
      return
    }
    result.hasStrayChild = true
  })

  return result
}
