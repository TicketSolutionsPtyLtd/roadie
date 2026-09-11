import {
  Children,
  type ReactElement,
  type ReactNode,
  isValidElement
} from 'react'

import { NavigatorGroup } from './NavigatorGroup'
import { NavigatorItem } from './NavigatorItem'
import type { NavigatorItemProps } from './NavigatorItem'
import { NavigatorPanel } from './NavigatorPanel'
import { NavigatorSecondary } from './NavigatorSecondary'
import type { NavigatorSecondaryProps } from './NavigatorSecondary'

/**
 * Separates an item's label from the `Navigator.Secondary` and
 * `Navigator.Panel` it can own, neither of which may live inside its row.
 * A second panel is ignored.
 */
export function splitItemChildren(children: ReactNode): {
  label: ReactNode[]
  secondary: ReactNode[]
  panel: ReactNode
} {
  const label: ReactNode[] = []
  const secondary: ReactNode[] = []
  let panel: ReactNode = null

  Children.toArray(children).forEach((child) => {
    if (!isValidElement(child)) {
      label.push(child)
      return
    }
    if (child.type === NavigatorSecondary) {
      secondary.push(child)
      return
    }
    if (child.type === NavigatorPanel) {
      panel ??= child
      return
    }
    label.push(child)
  })

  return { label, secondary, panel }
}

/**
 * The direct `Navigator.Item` children of a `Navigator.Secondary`, plus those
 * one level inside a `Navigator.Group`.
 *
 * This is a deliberate, single-type exception to the one-level rule: `Group`
 * is matched by reference exactly as `Secondary` and `Item` are, so the walk
 * stays immune to everything except server-authored trees. It is NOT a licence
 * for arbitrary component wrappers — those are still invisible.
 */
export function secondaryItems(
  secondary: ReactNode[]
): ReactElement<NavigatorItemProps>[] {
  const [nested] = secondary
  if (!isValidElement<NavigatorSecondaryProps>(nested)) return []

  const items: ReactElement<NavigatorItemProps>[] = []
  Children.forEach(nested.props.children, (child) => {
    if (!isValidElement(child)) return
    if (child.type === NavigatorItem) {
      items.push(child as ReactElement<NavigatorItemProps>)
      return
    }
    if (child.type === NavigatorGroup) {
      const groupProps = child.props as { children?: ReactNode }
      Children.forEach(groupProps.children, (grandChild) => {
        if (isValidElement(grandChild) && grandChild.type === NavigatorItem) {
          items.push(grandChild as ReactElement<NavigatorItemProps>)
        }
      })
    }
  })
  return items
}

/**
 * The values of the `Navigator.Item`s `secondaryItems` finds — the section's
 * declared sub-destinations.
 */
export function secondaryDescendantValues(secondary: ReactNode[]): string[] {
  return secondaryItems(secondary).map((item) => item.props.value)
}

/**
 * The href of the first item `secondaryItems` finds that has one — the
 * landing page a routeless section delegates to.
 */
export function firstSecondaryHref(secondary: ReactNode[]): string | undefined {
  return secondaryItems(secondary).find((item) => item.props.href !== undefined)
    ?.props.href
}

/**
 * The `value` of the first item `secondaryItems` finds that has an `href` —
 * the routeless section's landing value, paired with the href
 * `firstSecondaryHref` returns for that same item.
 */
export function firstSecondaryValue(
  secondary: ReactNode[]
): string | undefined {
  return secondaryItems(secondary).find((item) => item.props.href !== undefined)
    ?.props.value
}
