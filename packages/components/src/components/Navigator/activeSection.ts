import { Children, type ReactElement, isValidElement } from 'react'

import { type NavigatorActiveSection, isBranchActive } from './NavigatorContext'
import type { NavigatorItemProps } from './NavigatorItem'
import {
  NavigatorMenuItem,
  type NavigatorMenuItemProps
} from './NavigatorMenuItem'
import type { CollectedSlots } from './collectSlots'
import type { NavigatorSlotMeta } from './mobileSlots'
import { secondaryBlocks } from './splitSecondary'

export const slotsOf = (collected: CollectedSlots) => [
  ...collected.automatic,
  ...collected.pinnedSlots
]

function sectionWhere(
  slots: readonly NavigatorSlotMeta[],
  matches: (slot: NavigatorSlotMeta) => boolean
): NavigatorActiveSection | null {
  const slot = slots.find(
    (candidate) => candidate.secondary && matches(candidate)
  )
  if (!slot?.secondary) return null
  return {
    value: slot.value,
    href: slot.declaredHref,
    label: slot.label,
    secondary: slot.secondary,
    root:
      slot.declaredHref !== undefined && slot.secondary.root === 'page'
        ? 'page'
        : 'list'
  }
}

/** The branch-active item with a `Navigator.Secondary`. */
export const findActiveSection = (
  slots: readonly NavigatorSlotMeta[],
  value: string | undefined
) =>
  sectionWhere(slots, (slot) =>
    isBranchActive(slot.value, slot.descendants, value)
  )

/** The item with a `Navigator.Secondary` whose `value` is `itemValue`. */
export const findSectionByValue = (
  slots: readonly NavigatorSlotMeta[],
  itemValue: string
) => sectionWhere(slots, (slot) => slot.value === itemValue)

/** The `Navigator.Item` whose `value` is `itemValue`, in Primary or any Secondary. */
export function findItem(
  slots: readonly NavigatorSlotMeta[],
  itemValue: string
): Pick<NavigatorItemProps, 'onClick'> | undefined {
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
