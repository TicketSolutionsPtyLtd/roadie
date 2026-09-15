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

/** An item's label, apart from its Secondary and Menu. A second menu is ignored. */
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

/** The label's first character, capitalised — the glyph for an item without an icon. */
export function initialOf(node: ReactNode): string {
  return Array.from(textOf(node).trim())[0]?.toUpperCase() ?? ''
}

export type SecondaryBlock = {
  kind: 'group' | 'loose'
  /** The group's `Navigator.GroupTitle` children; null when it has none. */
  title: ReactNode
  items: ReactElement<NavigatorItemProps>[]
}

/** A Secondary's items and groups in authored order, one level deep. */
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

export function secondaryItems(
  secondary: ReactNode[]
): ReactElement<NavigatorItemProps>[] {
  const [declaration] = secondary
  if (!isValidElement<NavigatorSecondaryProps>(declaration)) return []
  return secondaryBlocks(declaration.props.children).flatMap(
    (block) => block.items
  )
}

export function secondaryDescendantValues(secondary: ReactNode[]): string[] {
  return secondaryItems(secondary).map((item) => item.props.value)
}

/** The first sub-page with an href: where a routeless section lands. */
export function firstRoutedSecondary(
  secondary: ReactNode[]
): NavigatorItemProps | undefined {
  return secondaryItems(secondary).find((item) => item.props.href !== undefined)
    ?.props
}
