'use client'

import {
  type CSSProperties,
  Children,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  isValidElement,
  use,
  useEffect,
  useMemo,
  useRef
} from 'react'

import { DotsThreeIcon } from '@phosphor-icons/react'

import { cn } from '@oztix/roadie-core/utils'

import { isDev } from '../../utils/isDev'
import { ScrollArea } from '../ScrollArea'
import { Tooltip } from '../Tooltip'
import {
  type NavigatorActiveSection,
  NavigatorContext,
  isActiveValue,
  isBranchActive,
  isSectionActive
} from './NavigatorContext'
import { NavigatorDestination } from './NavigatorDestination'
import { NavigatorFoldedContext } from './NavigatorFoldedContext'
import { NavigatorGroup } from './NavigatorGroup'
import { NavigatorIndicator } from './NavigatorIndicator'
import { NavigatorItem, type NavigatorItemProps } from './NavigatorItem'
import { NavigatorMenuHost, menuId } from './NavigatorMenuHost'
import type { NavigatorSecondaryProps } from './NavigatorSecondary'
import { NavigatorTab, type NavigatorTabProps } from './NavigatorTab'
import { NavigatorTileTooltip } from './NavigatorTileTooltip'
import { fixedCapsules, primaryCapsules, wrapCapsules } from './capsules'
import { collectSlots } from './collectSlots'
import {
  type MobileSlots,
  type NavigatorSlotMeta,
  OVERFLOW_LABEL,
  deriveMobileSlots,
  phoneBarCapacity
} from './mobileSlots'
import { presentNavIcon } from './presentNavIcon'
import { activeHref, rememberedHref } from './sectionMemory'
import {
  secondaryDescendantValues,
  splitItemChildren,
  textOf
} from './splitSecondary'
import { usePrimaryCapacity } from './usePrimaryCapacity'
import {
  navigatorCapsuleVariants,
  navigatorItemLabelClass,
  navigatorItemVariants,
  navigatorPrimaryBrandVariants,
  navigatorPrimaryCircleVariants,
  navigatorPrimaryClusterContentVariants,
  navigatorPrimaryClusterVariants,
  navigatorPrimaryClusterViewportVariants,
  navigatorPrimaryHorizontalVariants,
  navigatorPrimaryPillVariants,
  navigatorPrimaryPinnedVariants,
  navigatorPrimaryTrackVariants,
  navigatorPrimaryVerticalVariants
} from './variants'

export type { MobileSlots, NavigatorSlotMeta }
export { deriveMobileSlots }

export type NavigatorPrimaryProps = {
  /** Names the navigation landmark, e.g. 'Primary'. */
  'aria-label': string
  className?: string
  children?: ReactNode
}

export function NavigatorPrimary({
  'aria-label': ariaLabel,
  className,
  children
}: NavigatorPrimaryProps) {
  const {
    value: activeValue,
    setValue,
    setActiveSection,
    navCollapsed,
    setNavCollapsed,
    primaryNav,
    setPinExpanded,
    scrollActivePaneToTop,
    overflowOpen,
    setOverflowOpen,
    overflowPaneId,
    setOverflowItems,
    overflowOpener,
    hasContent,
    openMenu,
    setOpenMenu,
    sectionMemory,
    rememberSection,
    showList,
    onShowListChange,
    expanded,
    expandedFromDocument,
    primaryId
  } = use(NavigatorContext)
  const tabTrackRef = useRef<HTMLDivElement>(null)
  const clusterRef = useRef<HTMLDivElement>(null)
  const pinnedRef = useRef<HTMLDivElement>(null)

  const collected = useMemo(() => collectSlots(children), [children])
  const items = [...collected.automatic, ...collected.pinnedSlots]

  // Only an item without a Secondary, deep in an undeclared sub-route, is worth remembering.
  const branchSection = items.find((item) => isSectionActive(item, activeValue))
  const branchValue =
    branchSection?.descendants.length === 0 ? branchSection.value : undefined
  const deepHref =
    branchValue !== undefined && activeValue !== branchValue
      ? activeHref(activeValue, undefined)
      : undefined

  useEffect(() => {
    if (branchValue === undefined || deepHref === undefined) return
    rememberSection(branchValue, deepHref)
  }, [branchValue, deepHref, rememberSection])

  const activeSection = useMemo<NavigatorActiveSection | null>(() => {
    let active: NavigatorActiveSection | null = null

    const visitItem = (child: ReactElement) => {
      const itemProps = child.props as NavigatorItemProps
      const { label, secondary } = splitItemChildren(itemProps.children)
      const [declaration] = secondary
      if (!isValidElement<NavigatorSecondaryProps>(declaration)) return
      const branchActive = isBranchActive(
        itemProps.value,
        secondaryDescendantValues(secondary),
        activeValue
      )
      if (!branchActive) return
      active ??= {
        value: itemProps.value,
        href: itemProps.href,
        label,
        secondary: declaration.props
      }
    }

    Children.forEach(children, (child) => {
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
  }, [children, activeValue])

  const slots = deriveMobileSlots(collected.automatic, collected.pinnedSlots)

  useEffect(() => {
    // An open menu is the topmost layer; its own Escape closes it first.
    if (!overflowOpen || openMenu !== null) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOverflowOpen(false)
      overflowOpener.current?.focus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [overflowOpen, openMenu, setOverflowOpen, overflowOpener])

  useEffect(() => {
    setActiveSection(activeSection)
  }, [activeSection, setActiveSection])

  // Warnings live in effects, not the walk: React 19 StrictMode double-invokes render.
  const hasStrayChild = collected.hasStrayChild
  useEffect(() => {
    if (!isDev() || !hasStrayChild) return
    console.warn(
      '[Roadie] Navigator.Primary only recognises Navigator.Item, ' +
        'Navigator.Group, Navigator.Brand and Navigator.ExpandToggle by ' +
        'direct element-type reference, and skipped a child that is not ' +
        'one of those. A component that renders, or merely returns, a ' +
        'Navigator.Item — including one extracted to share it across ' +
        'sections — is not that reference either, so it is invisible ' +
        'the same way. Fragments, mapped wrappers, and trees authored ' +
        'in a server component (Flight replaces each element type with ' +
        'a lazy reference) fail for the same reason. Render ' +
        'Navigator.Item directly as a child. See COMPOUND_PATTERNS.md ' +
        '§1.2.'
    )
  }, [hasStrayChild])

  const conflicting = collected.conflictingPlacement.join(', ')
  useEffect(() => {
    if (!isDev() || conflicting === '') return
    console.warn(
      `[Roadie] Navigator.Item ${conflicting} declares a placement that ` +
        "differs from its Navigator.Group's. The group's placement wins — " +
        'move the item out of the group to place it on its own.'
    )
  }, [conflicting])

  const routeless = items
    .filter(
      (slot) => slot.descendants.length > 0 && slot.declaredHref === undefined
    )
    .map((slot) => slot.value)
    .join(', ')
  useEffect(() => {
    if (!isDev() || routeless === '') return
    console.warn(
      `[Roadie] Navigator.Item ${routeless} declares a Navigator.Secondary ` +
        'but no href. Every section needs its own route: it shows the ' +
        "section's list pane, and it is where Back goes from a sub-page."
    )
  }, [routeless])

  const pinnedFirst = collected.pinnedBeforeCluster
  useEffect(() => {
    if (!isDev() || !pinnedFirst) return
    console.warn(
      '[Roadie] Navigator.Primary has a pinned item written before other ' +
        'items. Pinned items render at the bottom of the vertical ' +
        "navigation and in the phone bar's trailing circle, so keyboard and " +
        'screen-reader order follows that, not your source order. Write ' +
        'pinned items last.'
    )
  }, [pinnedFirst])

  // Masks `navCollapsed` rather than resetting it, so `auto` snaps back to the state it hid.
  const collapsed = navCollapsed && primaryNav === 'auto'
  const navHidden = primaryNav === 'hidden'

  const folded = slots.overflow
  const hasMore = folded.length > 0
  const pinnedTab = slots.pinned
  const foldedIsActive = folded.some((slot) =>
    isSectionActive(slot, activeValue)
  )
  const pinnedIsActive =
    pinnedTab !== undefined && isSectionActive(pinnedTab, activeValue)
  // An open disclosure takes the pill from every route tab; only More also takes aria-current.
  const disclosureOpen = overflowOpen || openMenu !== null
  // The pinned circle already sits at the trailing edge, so it is the right circle.
  const activeIsRight = pinnedTab ? pinnedIsActive : hasMore && foldedIsActive
  // With the pinned circle on the right, an active folded item makes More the left circle.
  const moreCircleSide = !pinnedTab
    ? 'right'
    : foldedIsActive && !pinnedIsActive
      ? 'left'
      : undefined
  const tabCount = slots.tabs.length + (hasMore ? 1 : 0)

  // `folded` is a fresh array every render; its key is the stable identity.
  const foldedKey = folded.map((slot) => slot.value).join(',')
  useEffect(() => {
    setOverflowItems('horizontal', folded)
  }, [foldedKey, setOverflowItems])

  const verticalFolded = usePrimaryCapacity(
    clusterRef,
    primaryCapsules(collected.cluster),
    fixedCapsules(collected.cluster),
    !expanded
  )
  const verticalFoldedSlots = collected.automatic.filter((slot) =>
    verticalFolded.has(slot.value)
  )
  const verticalFoldedKey = verticalFoldedSlots
    .map((slot) => slot.value)
    .join(',')
  useEffect(() => {
    setOverflowItems('vertical', verticalFoldedSlots)
  }, [verticalFoldedKey, setOverflowItems])
  const verticalMoreActive =
    overflowOpen ||
    (verticalFoldedSlots.some((slot) => isSectionActive(slot, activeValue)) &&
      !disclosureOpen)

  const verticalMoreTile = (
    <NavigatorDestination
      ariaCurrent={verticalMoreActive ? 'true' : undefined}
      dataCurrent={verticalMoreActive}
      expanded={overflowOpen}
      controls={overflowOpen ? overflowPaneId : undefined}
      className={navigatorItemVariants({
        active: verticalMoreActive
      })}
      onClick={(event) => {
        overflowOpener.current = event.currentTarget as HTMLElement
        setOpenMenu(null)
        setOverflowOpen(!overflowOpen)
      }}
    >
      <span data-slot='navigator-item-icon'>
        {presentNavIcon(
          <DotsThreeIcon />,
          cn('size-6', verticalMoreActive && 'animate-pop-tap')
        )}
      </span>
      <span
        data-slot='navigator-item-label'
        className={navigatorItemLabelClass}
      >
        {OVERFLOW_LABEL}
      </span>
    </NavigatorDestination>
  )

  const foldedWithNoHost = hasMore && !hasContent
  useEffect(() => {
    if (!isDev() || !foldedWithNoHost) return
    console.warn(
      '[Roadie] Navigator.Primary folded items into a More tab, but no ' +
        'Navigator.Content is mounted to host the overflow pane. The ' +
        'folded destinations are unreachable below `md`. Render a ' +
        'Navigator.Content, optionally with a Navigator.OverflowPane inside it.'
    )
  }, [foldedWithNoHost])

  // Without `onShowListChange`, a section tab's href already leads up to its route.
  const selectDestination = (
    event: MouseEvent,
    tab: NavigatorSlotMeta,
    active: boolean
  ) => {
    setOverflowOpen(false)
    setOpenMenu(null)
    if (!active) {
      setValue(tab.value)
      return
    }
    if (collapsed) {
      event.preventDefault()
      setPinExpanded(true)
      setNavCollapsed(false)
      return
    }
    const ownsSection = activeSection?.value === tab.value
    const onSectionRoute = isActiveValue(tab.value, activeValue)
    if (ownsSection && onShowListChange && !onSectionRoute) {
      event.preventDefault()
      onShowListChange(!showList)
      return
    }
    if (ownsSection && onSectionRoute) {
      event.preventDefault()
      scrollActivePaneToTop()
      return
    }
    if (isActiveValue(tab.topValue, activeValue)) {
      event.preventDefault()
      scrollActivePaneToTop()
      return
    }
    if (tab.href === undefined) {
      event.preventDefault()
      setValue(tab.topValue)
    }
  }

  const tabHref = (tab: NavigatorSlotMeta, active: boolean) =>
    tab.descendants.length > 0
      ? tab.href
      : rememberedHref(sectionMemory, tab.value, tab.href, active)

  const renderTab = (tab: NavigatorSlotMeta, tabProps: NavigatorTabProps) =>
    tab.menu ? (
      <NavigatorMenuHost
        key={tab.value}
        surface='horizontal'
        value={tab.value}
        menu={tab.menu}
        label={textOf(tab.label) || undefined}
        trigger={
          <NavigatorTab
            {...tabProps}
            href={undefined}
            active={openMenu === menuId('horizontal', tab.value)}
            current={false}
            onSelect={undefined}
            onClick={() => setOverflowOpen(false)}
          />
        }
      />
    ) : (
      <NavigatorTab key={tab.value} {...tabProps} />
    )

  return (
    <>
      <nav
        id={primaryId}
        data-slot='navigator-primary'
        data-orientation='vertical'
        data-expanded={expanded ? '' : undefined}
        data-from-document={expandedFromDocument ? '' : undefined}
        aria-label={ariaLabel}
        className={cn(navigatorPrimaryVerticalVariants(), className)}
      >
        <Tooltip.Provider>
          {collected.brand.length > 0 ? (
            <div
              data-slot='navigator-primary-brand'
              className={navigatorPrimaryBrandVariants()}
            >
              {collected.brand}
            </div>
          ) : null}
          <ScrollArea
            data-slot='navigator-primary-cluster'
            className={navigatorPrimaryClusterVariants()}
          >
            <ScrollArea.Viewport
              ref={clusterRef}
              data-slot='navigator-primary-cluster-viewport'
              className={navigatorPrimaryClusterViewportVariants()}
            >
              <ScrollArea.Content
                fitWidth={false}
                className={navigatorPrimaryClusterContentVariants()}
              >
                <NavigatorFoldedContext value={verticalFolded}>
                  {wrapCapsules(collected.cluster, verticalFolded)}
                </NavigatorFoldedContext>
                {verticalFoldedSlots.length > 0 ? (
                  <ul
                    data-slot='navigator-capsule'
                    className={navigatorCapsuleVariants()}
                  >
                    <li>
                      <NavigatorTileTooltip
                        label={OVERFLOW_LABEL}
                        disabled={overflowOpen}
                        render={(asTrigger) => asTrigger(verticalMoreTile)}
                      />
                    </li>
                  </ul>
                ) : null}
              </ScrollArea.Content>
              <NavigatorIndicator trackRef={clusterRef} surface='vertical' />
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar flush>
              <ScrollArea.Thumb />
            </ScrollArea.Scrollbar>
          </ScrollArea>
          {collected.pinned.length > 0 ? (
            <div
              ref={pinnedRef}
              data-slot='navigator-primary-pinned'
              className={navigatorPrimaryPinnedVariants()}
            >
              {wrapCapsules(collected.pinned, new Set())}
              <NavigatorIndicator trackRef={pinnedRef} surface='vertical' />
            </div>
          ) : null}
        </Tooltip.Provider>
      </nav>
      <nav
        data-slot='navigator-primary'
        data-orientation='horizontal'
        data-collapsed={String(collapsed)}
        data-hidden={String(navHidden)}
        aria-label={`${ariaLabel} tabs`}
        style={
          {
            '--navigator-primary-count': String(tabCount),
            '--navigator-primary-slots': String(
              phoneBarCapacity(pinnedTab !== undefined)
            ),
            '--navigator-primary-pinned': pinnedTab ? '4rem' : '0rem'
          } as CSSProperties
        }
        // `aria-hidden` too: `inert` alone doesn't leave every AT tree.
        inert={navHidden}
        aria-hidden={navHidden || undefined}
        className={navigatorPrimaryHorizontalVariants({
          collapsed,
          hidden: navHidden,
          pinned: pinnedTab !== undefined
        })}
      >
        <div
          ref={tabTrackRef}
          data-slot='navigator-primary-track'
          className={navigatorPrimaryTrackVariants({ collapsed })}
        >
          <div
            aria-hidden
            data-slot='navigator-primary-pill'
            className={navigatorPrimaryPillVariants({ collapsed })}
          />
          <NavigatorIndicator
            trackRef={tabTrackRef}
            surface='horizontal'
            hidden={collapsed}
          />
          {slots.tabs.map((tab, tabIndex) => {
            const active = isSectionActive(tab, activeValue)
            // With the right circle taken, the first tab floats left so two circles always show.
            const isLeftCircle = activeIsRight
              ? tab.value === slots.tabs[0]?.value
              : active
            return renderTab(tab, {
              label: tab.label,
              icon: tab.icon,
              badge: tab.badge,
              href: tabHref(tab, active),
              active: active && !disclosureOpen,
              current: active && !overflowOpen,
              isPage: isActiveValue(tab.value, activeValue),
              collapsed,
              circleSide: isLeftCircle ? 'left' : undefined,
              index: tabIndex,
              onSelect: (event) => selectDestination(event, tab, active)
            })
          })}
          {hasMore ? (
            <NavigatorTab
              label={OVERFLOW_LABEL}
              icon={<DotsThreeIcon />}
              active={overflowOpen || (foldedIsActive && !disclosureOpen)}
              current={overflowOpen || foldedIsActive}
              collapsed={collapsed}
              circleSide={moreCircleSide}
              index={slots.tabs.length}
              expanded={overflowOpen}
              controls={overflowOpen ? overflowPaneId : undefined}
              onSelect={(event) => {
                if (event.currentTarget instanceof HTMLElement) {
                  overflowOpener.current = event.currentTarget
                }
                setOpenMenu(null)
                setOverflowOpen(!overflowOpen)
              }}
            />
          ) : null}
        </div>
        {pinnedTab ? (
          <div
            data-slot='navigator-primary-circle'
            className={navigatorPrimaryCircleVariants()}
          >
            {renderTab(pinnedTab, {
              label: pinnedTab.label,
              icon: pinnedTab.icon,
              badge: pinnedTab.badge,
              href: tabHref(pinnedTab, pinnedIsActive),
              active: pinnedIsActive && !disclosureOpen,
              current: pinnedIsActive && !overflowOpen,
              isPage: isActiveValue(pinnedTab.value, activeValue),
              pinned: true,
              index: 0,
              onSelect: (event) =>
                selectDestination(event, pinnedTab, pinnedIsActive)
            })}
          </div>
        ) : null}
      </nav>
    </>
  )
}

NavigatorPrimary.displayName = 'Navigator.Primary'
