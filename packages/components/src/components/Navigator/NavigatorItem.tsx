'use client'

import { type ReactNode, isValidElement, use, useEffect } from 'react'

import { CaretRightIcon } from '@phosphor-icons/react'

import { cn } from '@oztix/roadie-core/utils'

import { isDev } from '../../utils/isDev'
import { Popover } from '../Popover'
import { tabsTabVariants } from '../Tabs/variants'
import {
  NavigatorContext,
  isActiveValue,
  isBranchActive
} from './NavigatorContext'
import { NavigatorDestination } from './NavigatorDestination'
import type { NavigatorPanelProps } from './NavigatorPanel'
import { NavigatorPresentationContext } from './NavigatorPresentationContext'
import { presentNavIcon } from './presentNavIcon'
import { rememberedHref } from './sectionMemory'
import {
  firstSecondaryHref,
  secondaryDescendantValues,
  splitItemChildren
} from './splitSecondary'
import {
  navigatorChevronVariants,
  navigatorItemTrailingVariants,
  navigatorItemVariants
} from './variants'

export type NavigatorItemProps = {
  /**
   * Identifies this destination. Compared against Navigator's `value`.
   * Must be unique across the whole tree — matching is value-equality, so
   * two items sharing a value both light up. Using each item's `href` is
   * the reliable choice when destinations map to routes.
   */
  value: string
  /**
   * Routes through `RoadieLinkProvider` — the same smart-href contract as
   * `Card` and `List.Item`: internal hrefs route through the provider,
   * `http(s)://` / `//` render `<a target='_blank' rel='noopener
   * noreferrer'>`, `mailto:` / `tel:` / `sms:` render plain anchors. Omit
   * to render a `<button>`.
   *
   * A section with no landing page of its own: omit `href` and give it a
   * `Navigator.Secondary`; selecting it navigates to the first sub-page.
   */
  href?: string
  /** Leading icon. Phosphor `Icon`-suffixed export, sized with className. */
  icon?: ReactNode
  /** Count or status shown alongside the label. */
  badge?: ReactNode
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
  const { value: active, setValue, sectionMemory } = use(NavigatorContext)
  const presentation = use(NavigatorPresentationContext)
  const { label, secondary, panel } = splitItemChildren(children)
  // A section — an item that declares a Secondary — carries a chevron that
  // points down while it is expanded (branch-active) and right while collapsed.
  const isSection = secondary.length > 0
  // Navigation outranks a menu: a Secondary makes the item a section
  // regardless of a Panel also being declared, so the Panel is only read
  // when there is no Secondary to contend with.
  const declaresPanelWithSecondary = isSection && isValidElement(panel)
  const panelProps =
    !isSection && isValidElement<NavigatorPanelProps>(panel)
      ? panel.props
      : null
  // A section with no route of its own delegates to its first sub-page, so
  // selecting it lands on a real page routed through the provider. A panel
  // makes the item a disclosure: it owns a menu, not a destination.
  const effectiveHref = panelProps
    ? undefined
    : (href ?? firstSecondaryHref(secondary))
  // Exact drives currency; branch drives the Secondary reveal + chevron so a
  // section stays expanded while the active destination is one of its children.
  const descendants = secondaryDescendantValues(secondary)
  const isCurrent = isActiveValue(value, active)
  const isBranch = isBranchActive(value, descendants, active)
  // A bare sub-route keeps the pill here, or nothing would read as selected.
  const hasActiveSecondary = descendants.some((descendant) =>
    isActiveValue(descendant, active)
  )
  // Visual currency: the treatment and the sliding pill, published as
  // `data-current`. `aria-current` stays exact — a section is where you are,
  // not the page you are on — so the two are tracked separately. Exactly one
  // item holds this: a declared Secondary takes it from its parent, and a bare
  // sub-route leaves it with the section.
  const isCurrentish = isCurrent || (isBranch && !hasActiveSecondary)
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
    if (!isDev() || !declaresPanelWithSecondary) return
    console.warn(
      `[Roadie] Navigator.Item value='${value}' declares both a ` +
        'Navigator.Secondary and a Navigator.Panel. The Panel is ignored — ' +
        'an item with sub-navigation is a section, not a menu.'
    )
  }, [declaresPanelWithSecondary, value])

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

  // The strip reads as a Tabs `subtle` pill row — same class vocabulary, but
  // still a <nav> of routed links, so currency stays `aria-current`. Tabs'
  // own active colour keys off `data-[active]`, which only Base UI sets, so
  // the current item's `text-strong` is applied here instead.
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

  if (panelProps) {
    return (
      <Popover>
        <Popover.Trigger
          render={
            <button
              type='button'
              data-slot='navigator-item'
              className={finalClassName}
            />
          }
        >
          {content}
        </Popover.Trigger>
        <Popover.Content
          aria-label={panelProps['aria-label']}
          positionerProps={{ side: 'right', align: 'end', sideOffset: 8 }}
          className={cn('grid w-64 gap-1.5 p-2', panelProps.className)}
        >
          {panelProps.children}
        </Popover.Content>
      </Popover>
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
      {/* Gated here rather than inside `Navigator.Secondary` so the same
          element can also be read by `Navigator.Primary` for the strip.
          Branch-active so a section reveals its children while one is current. */}
      {isBranch && isSection ? secondary : null}
    </>
  )
}

NavigatorItem.displayName = 'Navigator.Item'
