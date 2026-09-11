'use client'

import { type ReactNode, use, useEffect } from 'react'

import { CaretRightIcon } from '@phosphor-icons/react'

import { cn } from '@oztix/roadie-core/utils'

import { isDev } from '../../utils/isDev'
import { tabsTabVariants } from '../Tabs/variants'
import {
  NavigatorContext,
  isActiveValue,
  isBranchActive
} from './NavigatorContext'
import { NavigatorDestination } from './NavigatorDestination'
import { NavigatorMenuHost, menuId } from './NavigatorMenuHost'
import { NavigatorPresentationContext } from './NavigatorPresentationContext'
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
import {
  navigatorChevronVariants,
  navigatorItemTrailingVariants,
  navigatorItemVariants
} from './variants'

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
  badge,
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
  const presentation = use(NavigatorPresentationContext)
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
  const hasActiveSecondary = descendants.some((descendant) =>
    isActiveValue(descendant, active)
  )
  // `data-current` drives the pill; `aria-current` stays exact. An open menu takes the pill.
  const isCurrentish =
    menuOpen ||
    (openMenu === null && (isCurrent || (isBranch && !hasActiveSecondary)))
  const state = isCurrentish ? 'current' : isBranch ? 'section' : 'idle'
  const targetHref = rememberedHref(
    sectionMemory,
    value,
    effectiveHref,
    isBranch
  )

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

  const trailing =
    badge || isSection ? (
      <span className={navigatorItemTrailingVariants()}>
        {badge}
        {isSection ? (
          <CaretRightIcon
            weight='bold'
            aria-hidden='true'
            className={navigatorChevronVariants({ expanded: isBranch })}
          />
        ) : null}
      </span>
    ) : null

  const content = (
    <>
      {icon ? (
        <span data-slot='navigator-item-icon'>
          {presentNavIcon(icon, isBranch, 'size-6')}
        </span>
      ) : null}
      {/* `truncate` alone sizes to max-content in the compact column. */}
      <span className='max-w-full truncate'>{label}</span>
      {trailing}
    </>
  )

  const ariaCurrent = isCurrent ? 'page' : undefined

  // Tabs' active colour keys off Base UI's `data-[active]`, which a link never gets.
  const finalClassName = cn(
    presentation === 'strip'
      ? cn(
          tabsTabVariants({ emphasis: 'subtle', size: 'sm' }),
          'shrink-0',
          isCurrent && 'text-strong'
        )
      : navigatorItemVariants({ state }),
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
    <>
      <NavigatorDestination
        href={targetHref}
        ariaCurrent={ariaCurrent}
        dataCurrent={isCurrentish}
        className={finalClassName}
        onClick={handleClick}
      >
        {content}
      </NavigatorDestination>
      {isBranch && isSection ? secondary : null}
    </>
  )
}

NavigatorItem.displayName = 'Navigator.Item'
