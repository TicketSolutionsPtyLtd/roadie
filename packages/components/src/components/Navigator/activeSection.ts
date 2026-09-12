import {
  Children,
  type ReactElement,
  type ReactNode,
  isValidElement
} from 'react'

import { type NavigatorActiveSection, isBranchActive } from './NavigatorContext'
import { NavigatorGroup } from './NavigatorGroup'
import { NavigatorItem, type NavigatorItemProps } from './NavigatorItem'
import type { NavigatorSecondaryProps } from './NavigatorSecondary'
import { secondaryDescendantValues, splitItemChildren } from './splitSecondary'

type SectionMatch = (
  props: NavigatorItemProps,
  descendants: string[]
) => boolean

function findSection(
  primaryChildren: ReactNode,
  matches: SectionMatch
): NavigatorActiveSection | null {
  let found: NavigatorActiveSection | null = null

  const visitItem = (child: ReactElement) => {
    const itemProps = child.props as NavigatorItemProps
    const { label, secondary } = splitItemChildren(itemProps.children)
    const [declaration] = secondary
    if (!isValidElement<NavigatorSecondaryProps>(declaration)) return
    if (!matches(itemProps, secondaryDescendantValues(secondary))) return
    found ??= {
      value: itemProps.value,
      href: itemProps.href,
      label,
      secondary: declaration.props,
      root:
        itemProps.href !== undefined && declaration.props.root === 'page'
          ? 'page'
          : 'list'
    }
  }

  Children.forEach(primaryChildren, (child) => {
    if (!isValidElement(child)) return
    if (child.type === NavigatorGroup) {
      const groupProps = child.props as { children?: ReactNode }
      Children.forEach(groupProps.children, (grandChild) => {
        if (isValidElement(grandChild) && grandChild.type === NavigatorItem) {
          visitItem(grandChild)
        }
      })
      return
    }
    if (child.type === NavigatorItem) visitItem(child)
  })

  return found
}

/** The branch-active item with a `Navigator.Secondary`, from Primary's children. */
export function findActiveSection(
  primaryChildren: ReactNode,
  value: string | undefined
): NavigatorActiveSection | null {
  return findSection(primaryChildren, (props, descendants) =>
    isBranchActive(props.value, descendants, value)
  )
}

/** The item with a `Navigator.Secondary` whose `value` is `itemValue`. */
export function findSectionByValue(
  primaryChildren: ReactNode,
  itemValue: string
): NavigatorActiveSection | null {
  return findSection(primaryChildren, (props) => props.value === itemValue)
}
