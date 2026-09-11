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

/** The branch-active item with a `Navigator.Secondary`, from Primary's children. */
export function findActiveSection(
  primaryChildren: ReactNode,
  value: string | undefined
): NavigatorActiveSection | null {
  let active: NavigatorActiveSection | null = null

  const visitItem = (child: ReactElement) => {
    const itemProps = child.props as NavigatorItemProps
    const { label, secondary } = splitItemChildren(itemProps.children)
    const [declaration] = secondary
    if (!isValidElement<NavigatorSecondaryProps>(declaration)) return
    const branchActive = isBranchActive(
      itemProps.value,
      secondaryDescendantValues(secondary),
      value
    )
    if (!branchActive) return
    active ??= {
      value: itemProps.value,
      href: itemProps.href,
      label,
      secondary: declaration.props
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

    if (child.type !== NavigatorItem) return
    visitItem(child)
  })

  return active
}
