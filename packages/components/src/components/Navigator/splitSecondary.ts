import {
  Children,
  type ReactElement,
  type ReactNode,
  isValidElement
} from 'react'

import { NavigatorGroup } from './NavigatorGroup'
import {
  NavigatorGroupTitle,
  type NavigatorGroupTitleProps
} from './NavigatorGroupTitle'
import { NavigatorItem } from './NavigatorItem'
import type { NavigatorItemProps } from './NavigatorItem'
import { NavigatorMenu, type NavigatorMenuProps } from './NavigatorMenu'
import { NavigatorSecondary } from './NavigatorSecondary'
import type { NavigatorSecondaryProps } from './NavigatorSecondary'

/**
 * Separates an item's label from the `Navigator.Secondary` and
 * `Navigator.Menu` it can own, neither of which renders in its row.
 * A second menu is ignored.
 */
export function splitItemChildren(children: ReactNode): {
  label: ReactNode[]
  secondary: ReactNode[]
  menu?: ReactElement<NavigatorMenuProps>
} {
  const label: ReactNode[] = []
  const secondary: ReactNode[] = []
  let menu: ReactElement<NavigatorMenuProps> | undefined

  Children.toArray(children).forEach((child) => {
    if (!isValidElement(child)) {
      label.push(child)
      return
    }
    if (child.type === NavigatorSecondary) {
      secondary.push(child)
      return
    }
    if (child.type === NavigatorMenu) {
      menu ??= child as ReactElement<NavigatorMenuProps>
      return
    }
    label.push(child)
  })

  return { label, secondary, menu }
}

/** The plain text of a label, for accessible names and search. */
export function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return textOf(node.props.children)
  }
  return ''
}

export type SecondaryBlock = {
  kind: 'group' | 'loose'
  /** The group's `Navigator.GroupTitle` children; null when it has none. */
  title: ReactNode
  items: ReactElement<NavigatorItemProps>[]
}

/**
 * A `Navigator.Secondary`'s children as runs of loose `Navigator.Item`s and
 * `Navigator.Group`s, in authored order. `Group` is the one wrapper matched
 * by reference, one level deep.
 */
export function secondaryBlocks(children: ReactNode): SecondaryBlock[] {
  const blocks: SecondaryBlock[] = []
  let loose: SecondaryBlock | null = null

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return
    if (child.type === NavigatorItem) {
      if (loose === null) {
        loose = { kind: 'loose', title: null, items: [] }
        blocks.push(loose)
      }
      loose.items.push(child as ReactElement<NavigatorItemProps>)
      return
    }
    if (child.type !== NavigatorGroup) return
    loose = null
    const group: SecondaryBlock = { kind: 'group', title: null, items: [] }
    Children.forEach(
      (child.props as { children?: ReactNode }).children,
      (grandChild) => {
        if (!isValidElement(grandChild)) return
        if (grandChild.type === NavigatorGroupTitle) {
          group.title =
            (grandChild as ReactElement<NavigatorGroupTitleProps>).props
              .children ?? null
        } else if (grandChild.type === NavigatorItem) {
          group.items.push(grandChild as ReactElement<NavigatorItemProps>)
        }
      }
    )
    blocks.push(group)
  })

  return blocks
}

/** Every `Navigator.Item` `secondaryBlocks` finds, flattened. */
export function secondaryItems(
  secondary: ReactNode[]
): ReactElement<NavigatorItemProps>[] {
  const [declaration] = secondary
  if (!isValidElement<NavigatorSecondaryProps>(declaration)) return []
  return secondaryBlocks(declaration.props.children).flatMap(
    (block) => block.items
  )
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
