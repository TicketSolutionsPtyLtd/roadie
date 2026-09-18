'use client'

import {
  Children,
  type ReactElement,
  type ReactNode,
  cloneElement,
  isValidElement,
  use,
  useEffect
} from 'react'

import { Menu } from '@base-ui/react/menu'

import { cn } from '@oztix/roadie-core/utils'

import {
  NavigatorActionsContext,
  NavigatorDisclosureContext,
  type NavigatorOverflowSets
} from './NavigatorContext'
import type { NavigatorMenuProps } from './NavigatorMenu'
import {
  NavigatorMenuItem,
  type NavigatorMenuItemProps
} from './NavigatorMenuItem'
import { navigatorMenuPopupClass } from './variants'

// Each folded row set is its own surface, so a row folded in both opens one popup.
export type NavigatorMenuSurface =
  'vertical' | 'horizontal' | `overflow-${keyof NavigatorOverflowSets}`

export const menuId = (surface: NavigatorMenuSurface, value: string) =>
  `${surface}:${value}`

// Functional, so closing one menu never clobbers another that opened since.
const release = (id: string) => (current: string | null) =>
  current === id ? null : current

const PLACEMENT = {
  vertical: { side: 'inline-end', align: 'start' },
  horizontal: { side: 'top', align: 'center' },
  'overflow-horizontal': { side: 'bottom', align: 'start' },
  'overflow-vertical': { side: 'bottom', align: 'start' }
} as const

export type NavigatorMenuHostProps = {
  surface: NavigatorMenuSurface
  value: string
  menu: ReactElement<NavigatorMenuProps>
  /** The item's label as text, naming the menu when it declares none. */
  label?: string
  trigger: ReactElement
}

// A menu's elements can be stale, so its items call through to the current tree.
function withCurrentHandlers(
  children: ReactNode,
  activate: (index: number) => void
) {
  let position = 0
  return Children.map(children, (child) => {
    if (!isValidElement(child) || child.type !== NavigatorMenuItem) {
      return child
    }
    const index = position++
    return cloneElement(child as ReactElement<NavigatorMenuItemProps>, {
      onSelect: () => activate(index)
    })
  })
}

// Open state lives on context so route destinations can yield the pill while a menu is open.
export function NavigatorMenuHost({
  surface,
  value,
  menu,
  label,
  trigger
}: NavigatorMenuHostProps) {
  const { setOpenMenu, setOverflowOpen, activateMenuItem } = use(
    NavigatorActionsContext
  )
  const { openMenu } = use(NavigatorDisclosureContext)
  const id = menuId(surface, value)
  const { side, align } = PLACEMENT[surface]
  const declaredLabel = menu.props['aria-label']

  // A host can unmount while open, e.g. when its item folds into More.
  useEffect(() => () => setOpenMenu(release(id)), [id, setOpenMenu])

  return (
    <Menu.Root
      open={openMenu === id}
      onOpenChange={(open, { reason }) => {
        setOpenMenu(open ? id : release(id))
        if (surface.startsWith('overflow') && reason === 'item-press') {
          setOverflowOpen(false)
        }
      }}
    >
      <Menu.Trigger render={trigger} />
      <Menu.Portal>
        <Menu.Positioner
          data-slot='navigator-menu-positioner'
          side={side}
          align={align}
          sideOffset={8}
          className='z-popover'
        >
          <Menu.Popup
            data-slot='navigator-menu'
            aria-label={declaredLabel ?? label}
            // Base UI labels the popup by its trigger, which outranks aria-label.
            {...(declaredLabel !== undefined && {
              'aria-labelledby': undefined
            })}
            className={cn(navigatorMenuPopupClass, menu.props.className)}
          >
            {withCurrentHandlers(menu.props.children, (index) =>
              activateMenuItem(value, index)
            )}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
