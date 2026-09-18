import { Children, type ReactElement, isValidElement } from 'react'

import {
  type NavigatorActiveSecondary,
  isBranchActive
} from './NavigatorContext'
import type { NavigatorItemProps } from './NavigatorItem'
import {
  NavigatorMenuItem,
  type NavigatorMenuItemProps
} from './NavigatorMenuItem'
import type { NavigatorSlotMeta } from './mobileSlots'
import { secondaryBlocks } from './splitSecondary'

function secondaryWhere(
  slots: readonly NavigatorSlotMeta[],
  matches: (slot: NavigatorSlotMeta) => boolean
): NavigatorActiveSecondary | null {
  const slot = slots.find(
    (candidate) => candidate.secondary && matches(candidate)
  )
  if (!slot?.secondary) return null
  return {
    value: slot.value,
    href: slot.declaredHref,
    label: slot.label,
    props: slot.secondary,
    overview:
      slot.declaredHref !== undefined && slot.secondary.overview === true
  }
}

/** The branch-active item with a `Navigator.Secondary`. */
export const findActiveSecondary = (
  slots: readonly NavigatorSlotMeta[],
  value: string | undefined
) =>
  secondaryWhere(slots, (slot) =>
    isBranchActive(slot.value, slot.descendants, value)
  )

/** The item with a `Navigator.Secondary` whose `value` is `itemValue`. */
export const findSecondaryByValue = (
  slots: readonly NavigatorSlotMeta[],
  itemValue: string
) => secondaryWhere(slots, (slot) => slot.value === itemValue)

/** The `Navigator.Item` whose `value` is `itemValue`, in Primary or any Secondary. */
export function findItem(
  slots: readonly NavigatorSlotMeta[],
  itemValue: string
): Pick<NavigatorItemProps, 'onSelect'> | undefined {
  for (const slot of slots) {
    if (slot.value === itemValue) return slot
    const sub = secondaryBlocks(slot.secondary?.children)
      .flatMap((block) => block.items)
      .find((item) => item.props.value === itemValue)
    if (sub) return sub.props
  }
  return undefined
}

/** The `index`th `Navigator.MenuItem` written directly in that item's menu. */
export function findMenuItem(
  slots: readonly NavigatorSlotMeta[],
  itemValue: string,
  index: number
): NavigatorMenuItemProps | undefined {
  const menu = slots.find((slot) => slot.value === itemValue)?.menu
  return Children.toArray(menu?.props.children).filter(
    (child): child is ReactElement<NavigatorMenuItemProps> =>
      isValidElement(child) && child.type === NavigatorMenuItem
  )[index]?.props
}
