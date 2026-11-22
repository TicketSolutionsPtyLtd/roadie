'use client'

import {
  type ReactElement,
  type ReactNode,
  cloneElement,
  isValidElement,
  use,
  useMemo
} from 'react'

import { NavigatorSelectionContext } from './NavigatorContext'
import type { NavigatorSlotMeta } from './mobileSlots'
import { secondaryBlocks, splitItemChildren, textOf } from './splitSecondary'

/** A Navigator destination or page as a `CommandPalette` command. */
export type NavigatorCommand = {
  /** The `Navigator.Item`'s `value`, unique, so it serves as a key. */
  value: string
  /** The item's label as plain text, which the palette matches. */
  label: string
  href: string
  /** The item's icon at `bold`; a page without one takes its destination's. */
  icon?: ReactNode
  /** The page's `Navigator.GroupTitle`, such as "Your views". */
  keywords?: string[]
}

export type NavigatorCommandGroup = {
  /** The destination's value, unique among groups, for a React key; absent for the group of destinations. */
  value?: string
  /** The destination's label; absent for the group of destinations. */
  label?: string
  items: NavigatorCommand[]
}

// Navigator draws its destinations duotone; a palette row uses the bold default.
function boldIcon(icon: ReactNode): ReactNode {
  return isValidElement(icon)
    ? cloneElement(icon as ReactElement<{ weight?: string }>, {
        weight: 'bold'
      })
    : icon
}

function pageCommands(slot: NavigatorSlotMeta): NavigatorCommand[] {
  return secondaryBlocks(slot.secondary?.children).flatMap((block) => {
    const title = textOf(block.title)
    return block.items.flatMap(({ props }) =>
      props.href === undefined
        ? []
        : [
            {
              value: props.value,
              label: textOf(splitItemChildren(props.children).label),
              href: props.href,
              icon: boldIcon(props.icon ?? slot.icon),
              ...(title ? { keywords: [title] } : {})
            }
          ]
    )
  })
}

function navigatorCommands(
  collected: readonly NavigatorSlotMeta[]
): NavigatorCommandGroup[] {
  // Search opens the palette it would be listed in, or links to a search page
  // that stands in for it.
  const slots = collected.filter((slot) => !slot.search)
  const destinations = slots.flatMap((slot) =>
    slot.href === undefined
      ? []
      : [
          {
            value: slot.value,
            label: textOf(slot.label),
            href: slot.href,
            icon: boldIcon(slot.icon)
          }
        ]
  )
  const sections = slots.map((slot) => ({
    value: slot.value,
    label: textOf(slot.label),
    items: pageCommands(slot)
  }))
  return [{ items: destinations }, ...sections].filter(
    (group) => group.items.length > 0
  )
}

/**
 * Navigator's destinations, their `Navigator.Secondary` pages, and any saved
 * views listed there, as groups of link commands for `CommandPalette`'s
 * `items`, leaving out `Navigator.Search`. Call it inside `<Navigator>`;
 * outside one it returns `[]`.
 */
export function useNavigatorCommands(): NavigatorCommandGroup[] {
  const { collected } = use(NavigatorSelectionContext)
  return useMemo(() => navigatorCommands(collected.ordered), [collected])
}
