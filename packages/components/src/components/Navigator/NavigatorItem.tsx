'use client'

import { type ReactElement, type ReactNode, use, useEffect } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { isDev } from '../../utils/isDev'
import type { BadgeProps } from '../Badge'
import {
  NavigatorContext,
  isActiveValue,
  isBranchActive
} from './NavigatorContext'
import { NavigatorDestination } from './NavigatorDestination'
import { NavigatorMenuHost, menuId } from './NavigatorMenuHost'
import { NavigatorTileTooltip } from './NavigatorTileTooltip'
import type {
  NavigatorPlacement,
  NavigatorVisibilityPriority
} from './mobileSlots'
import { badgeDot, badgeSmall, presentNavIcon } from './presentNavIcon'
import { rememberedHref } from './sectionMemory'
import {
  firstSecondaryHref,
  initialOf,
  secondaryDescendantValues,
  splitItemChildren,
  textOf
} from './splitSecondary'
import {
  navigatorItemIconlessLabelClass,
  navigatorItemInitialClass,
  navigatorItemLabelClass,
  navigatorItemTrailingVariants,
  navigatorItemVariants
} from './variants'

export type NavigatorItemProps = {
  /** Identifies this destination against Navigator's `value`; unique across the tree. */
  value: string
  /** Routes through `RoadieLinkProvider`; omit for a `<button>`, ignored when the item has a `Navigator.Menu`. */
  href?: string
  /** Leading icon. Phosphor `Icon`-suffixed export; without one, a tile shows the label's initial. */
  icon?: ReactNode
  /** A `Badge`. Collapsed and on the phone bar it shrinks to a dot in the corner (`hideLabel`); expanded it trails the label at `size='sm'`. */
  badge?: ReactElement<BadgeProps>
  /** Secondary text for `Navigator.SectionItems` and `useNavigatorSection`; the navigation never shows it. */
  description?: string
  /** `pinned` anchors it to the vertical navigation's bottom and the bar's trailing circle. @default 'automatic' */
  placement?: NavigatorPlacement
  /** Which items stay visible when space runs out; falls back to the group's. @default 'automatic' */
  visibilityPriority?: NavigatorVisibilityPriority
  className?: string
  children?: ReactNode
  /** Called when the item is activated on any surface, including when it opens its menu. */
  onClick?: () => void
}

export function NavigatorItem({
  value,
  href,
  icon,
  badge,
  className,
  children,
  onClick
}: NavigatorItemProps) {
  const {
    value: active,
    setValue,
    sectionMemory,
    openMenu,
    overflowOpen,
    setOverflowOpen,
    expanded
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
  // `data-current` drives the pill. An open menu or More takes it.
  const hasPill = menuOpen || (openMenu === null && !overflowOpen && isBranch)
  const targetHref = isSection
    ? effectiveHref
    : rememberedHref(sectionMemory, value, effectiveHref, isBranch)

  const handleClick = () => {
    setOverflowOpen(false)
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
          {presentNavIcon(icon, cn('size-6', hasPill && 'animate-pop-tap'))}
        </span>
      ) : (
        <span
          aria-hidden
          data-slot='navigator-item-initial'
          className={cn(
            navigatorItemInitialClass,
            hasPill && 'animate-pop-tap'
          )}
        >
          {initialOf(label)}
        </span>
      )}
      <span
        data-slot='navigator-item-label'
        className={cn(
          navigatorItemLabelClass,
          !icon && navigatorItemIconlessLabelClass
        )}
      >
        {label}
      </span>
      {badge ? (
        <>
          {' '}
          {expanded ? (
            <span
              data-slot='navigator-item-trailing'
              className={navigatorItemTrailingVariants()}
            >
              {badgeSmall(badge)}
            </span>
          ) : (
            badgeDot(badge)
          )}
        </>
      ) : null}
    </>
  )

  const ariaCurrent = isCurrent ? 'page' : isBranch ? 'true' : undefined
  const finalClassName = cn(
    navigatorItemVariants({ active: hasPill }),
    className
  )

  if (menu) {
    return (
      <NavigatorTileTooltip
        label={label}
        disabled={menuOpen}
        render={(asTrigger) => (
          <NavigatorMenuHost
            surface='vertical'
            value={value}
            menu={menu}
            label={textOf(label) || undefined}
            trigger={asTrigger(
              <NavigatorDestination
                dataCurrent={menuOpen}
                className={finalClassName}
                onClick={onClick}
              >
                {content}
              </NavigatorDestination>
            )}
          />
        )}
      />
    )
  }

  return (
    <NavigatorTileTooltip
      label={label}
      render={(asTrigger) =>
        asTrigger(
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
    />
  )
}

NavigatorItem.displayName = 'Navigator.Item'
