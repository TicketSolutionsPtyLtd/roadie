'use client'

import { type ReactNode, use, useEffect } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { isDev } from '../../utils/isDev'
import {
  NavigatorContext,
  isActiveValue,
  isBranchActive
} from './NavigatorContext'
import { NavigatorDestination } from './NavigatorDestination'
import { NavigatorMenuHost, menuId } from './NavigatorMenuHost'
import type {
  NavigatorPlacement,
  NavigatorVisibilityPriority
} from './mobileSlots'
import { presentNavIcon } from './presentNavIcon'
import { rememberedHref } from './sectionMemory'
import {
  firstSecondaryHref,
  secondaryDescendantValues,
  splitItemChildren,
  textOf
} from './splitSecondary'
import { navigatorItemVariants } from './variants'

export type NavigatorItemProps = {
  /** Identifies this destination against Navigator's `value`; unique across the tree. */
  value: string
  /** Routes through `RoadieLinkProvider`; omit for a `<button>`, ignored when the item has a `Navigator.Menu`. */
  href?: string
  /** Leading icon. Phosphor `Icon`-suffixed export, sized with className. */
  icon?: ReactNode
  /** Count or status shown alongside the label. */
  badge?: ReactNode
  /** `pinned` anchors it to the vertical navigation's bottom and the bar's trailing circle. @default 'automatic' */
  placement?: NavigatorPlacement
  /** Which items stay visible when space runs out; falls back to the group's. @default 'automatic' */
  visibilityPriority?: NavigatorVisibilityPriority
  className?: string
  children?: ReactNode
  onClick?: () => void
}

export function NavigatorItem({
  value,
  href,
  icon,
  className,
  children,
  onClick
}: NavigatorItemProps) {
  const {
    value: active,
    setValue,
    sectionMemory,
    openMenu
  } = use(NavigatorContext)
  const { label, secondary, menu: declaredMenu } = splitItemChildren(children)
  const isSection = secondary.length > 0
  const declaresMenuWithSecondary = isSection && declaredMenu !== undefined
  const menu = isSection ? undefined : declaredMenu
  const menuOpen = menu !== undefined && openMenu === menuId('vertical', value)
  // A routeless section lands on its first sub-page.
  const effectiveHref = href ?? firstSecondaryHref(secondary)
  const descendants = secondaryDescendantValues(secondary)
  // A menu opens rather than navigates, so no route lights it.
  const isCurrent = !menu && isActiveValue(value, active)
  const isBranch = !menu && isBranchActive(value, descendants, active)
  // `data-current` drives the pill. An open menu takes it.
  const hasPill = menuOpen || (openMenu === null && isBranch)
  const targetHref = isSection
    ? effectiveHref
    : rememberedHref(sectionMemory, value, effectiveHref, isBranch)

  const handleClick = () => {
    setValue(value)
    onClick?.()
  }

  // In an effect, not the walk: React 19 strict mode double-invokes render.
  useEffect(() => {
    if (!isDev() || !declaresMenuWithSecondary) return
    console.warn(
      `[Roadie] Navigator.Item value='${value}' declares both a ` +
        'Navigator.Secondary and a Navigator.Menu. The Menu is ignored — ' +
        'an item with sub-navigation is a section, not a menu.'
    )
  }, [declaresMenuWithSecondary, value])

  const content = (
    <>
      {icon ? (
        <span data-slot='navigator-item-icon'>
          {presentNavIcon(icon, isBranch, 'size-6')}
        </span>
      ) : null}
      <span data-slot='navigator-item-label' className='sr-only'>
        {label}
      </span>
    </>
  )

  const ariaCurrent = isCurrent ? 'page' : isBranch ? 'true' : undefined
  const finalClassName = cn(
    navigatorItemVariants({ active: isBranch }),
    className
  )

  if (menu) {
    return (
      <NavigatorMenuHost
        surface='vertical'
        value={value}
        menu={menu}
        label={textOf(label) || undefined}
        trigger={
          <NavigatorDestination
            dataCurrent={menuOpen}
            className={finalClassName}
          >
            {content}
          </NavigatorDestination>
        }
      />
    )
  }

  return (
    <NavigatorDestination
      href={targetHref}
      ariaCurrent={ariaCurrent}
      dataCurrent={hasPill}
      className={finalClassName}
      onClick={handleClick}
    >
      {content}
    </NavigatorDestination>
  )
}

NavigatorItem.displayName = 'Navigator.Item'
