'use client'

import {
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  cloneElement,
  use,
  useMemo
} from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { useDevWarning } from '../../utils/useDevWarning'
import type { BadgeProps } from '../Badge'
import {
  NavigatorActionsContext,
  NavigatorDisclosureContext,
  NavigatorExpansionContext,
  NavigatorSelectionContext,
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
import { opensElsewhere } from './opensElsewhere'
import { badgeDot, presentNavIcon } from './presentNavIcon'
import {
  firstRoutedSecondary,
  initialOf,
  secondaryDescendantValues,
  splitItemChildren,
  textOf
} from './splitSecondary'
import {
  navigatorItemIconlessLabelClass,
  navigatorItemInitialClass,
  navigatorItemLabelClass,
  navigatorItemTrailingClass,
  navigatorItemVariants
} from './variants'

export type NavigatorItemProps = {
  /** Identifies this destination against Navigator's `value`; unique across the tree. */
  value: string
  /** Routes through `RoadieLinkProvider`. Omit it for a `<button>`. Ignored with a `Navigator.Menu`. */
  href?: string
  /** A bare Phosphor icon. Without one, the tile shows the label's first letter. */
  icon?: ReactNode
  /** A `Badge`. Shows as a dot when collapsed and on the phone bar. */
  badge?: ReactElement<BadgeProps>
  /** Secondary text for `Navigator.SecondaryItems` and `useNavigatorSecondary`. The navigation never shows it. */
  description?: string
  /** `pinned` puts it at the bottom of the vertical navigation and in the phone bar's circle. @default 'automatic' */
  placement?: NavigatorPlacement
  /** Which items stay when space runs out. Falls back to the group's. @default 'automatic' */
  visibilityPriority?: NavigatorVisibilityPriority
  className?: string
  children?: ReactNode
  /** Called on every activation, including when it opens its menu. */
  onSelect?: () => void
}

export function NavigatorItem({
  value,
  href,
  icon,
  badge,
  className,
  children
}: NavigatorItemProps) {
  const { setValue, setOverflowOpen, closeOverflowOnRoute, activateItem } = use(
    NavigatorActionsContext
  )
  const { value: active } = use(NavigatorSelectionContext)
  const { openMenu, overflowOpen } = use(NavigatorDisclosureContext)
  const { expanded } = use(NavigatorExpansionContext)
  // By hand: the compiler re-runs these walks every render, handing the tile a new label.
  const {
    label,
    secondary,
    menu: declaredMenu,
    firstHref,
    descendants
  } = useMemo(() => {
    const split = splitItemChildren(children)
    return {
      ...split,
      firstHref: firstRoutedSecondary(split.secondary)?.href,
      descendants: secondaryDescendantValues(split.secondary)
    }
  }, [children])
  const hasSecondary = secondary.length > 0
  const declaresMenuWithSecondary = hasSecondary && declaredMenu !== undefined
  const menu = hasSecondary ? undefined : declaredMenu
  const menuOpen = menu !== undefined && openMenu === menuId('vertical', value)
  // A routeless secondary lands on its first sub-page.
  const effectiveHref = href ?? firstHref
  // A menu opens rather than navigates, so no route lights it.
  const isCurrent = !menu && isActiveValue(value, active)
  const isBranch = !menu && isBranchActive(value, descendants, active)
  // An open menu or More takes the pill.
  const hasPill = menuOpen || (openMenu === null && !overflowOpen && isBranch)
  const targetHref = effectiveHref

  // The element can be Root's structural copy, so its handler resolves through the current tree.
  const handleClick = (event: MouseEvent) => {
    if (!opensElsewhere(event)) {
      if (targetHref === undefined || isCurrent) setOverflowOpen(false)
      else closeOverflowOnRoute()
      setValue(value)
    }
    activateItem(value)
  }

  useDevWarning(
    declaresMenuWithSecondary &&
      `[Roadie] Navigator.Item '${value}' has a Secondary and a Menu; the Menu is ignored.`
  )

  // By hand: the compiler left this unmemoised, so every value change re-rendered each tile's tooltip.
  const content = useMemo(
    () => (
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
                className={navigatorItemTrailingClass}
              >
                {cloneElement(badge, { size: 'sm' })}
              </span>
            ) : (
              badgeDot(badge)
            )}
          </>
        ) : null}
      </>
    ),
    [icon, hasPill, label, badge, expanded]
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
                onClick={() => activateItem(value)}
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
