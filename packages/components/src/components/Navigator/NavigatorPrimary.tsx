'use client'

import {
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  use,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef
} from 'react'

import { DotsThreeIcon } from '@phosphor-icons/react'

import { cn } from '@oztix/roadie-core/utils'

import { useDevWarning } from '../../utils/useDevWarning'
import { ScrollArea } from '../ScrollArea'
import { Tooltip } from '../Tooltip'
import {
  NavigatorActionsContext,
  NavigatorBarContext,
  NavigatorDisclosureContext,
  NavigatorExpansionContext,
  NavigatorSelectionContext,
  isActiveValue,
  isDestinationActive
} from './NavigatorContext'
import { NavigatorDestination } from './NavigatorDestination'
import { NavigatorFoldedContext } from './NavigatorFoldedContext'
import { NavigatorIndicator } from './NavigatorIndicator'
import { NavigatorMenuHost, menuId } from './NavigatorMenuHost'
import { NavigatorTab, type NavigatorTabProps } from './NavigatorTab'
import { NavigatorTileTooltip } from './NavigatorTileTooltip'
import { primaryCapsules, wrapCapsules } from './capsules'
import {
  type NavigatorSlotMeta,
  OVERFLOW_LABEL,
  deriveMobileSlots,
  phoneBarCapacity
} from './mobileSlots'
import { opensElsewhere } from './opensElsewhere'
import { presentNavIcon } from './presentNavIcon'
import { PRIMARY_METRICS } from './primaryCapacity'
import { slotsSignature } from './primarySignature'
import { textOf } from './splitSecondary'
import { usePrimaryCapacity } from './usePrimaryCapacity'
import {
  navigatorCapsuleClass,
  navigatorItemLabelClass,
  navigatorItemVariants,
  navigatorPrimaryBrandVariants,
  navigatorPrimaryCircleClass,
  navigatorPrimaryClusterClass,
  navigatorPrimaryClusterContentClass,
  navigatorPrimaryClusterTrackClass,
  navigatorPrimaryClusterViewportClass,
  navigatorPrimaryFrameClass,
  navigatorPrimaryHorizontalVariants,
  navigatorPrimaryLaneClass,
  navigatorPrimaryPillVariants,
  navigatorPrimaryPinnedClass,
  navigatorPrimaryTrackVariants,
  navigatorPrimaryVerticalClass
} from './variants'

export type NavigatorPrimaryProps = {
  /** Names the navigation landmark, e.g. 'Primary'. */
  'aria-label': string
  className?: string
  children?: ReactNode
}

export function NavigatorPrimary({
  'aria-label': ariaLabel,
  className
}: NavigatorPrimaryProps) {
  const {
    setValue,
    primaryDerived,
    setNavCollapsed,
    setPinExpanded,
    scrollActivePaneToTop,
    setOverflowOpen,
    closeOverflowOnRoute,
    overflowPaneId,
    setOverflowItems,
    overflowOpenerRef,
    setOpenMenu,
    onShowListChange,
    activateItem,
    expandedFromDocument,
    primaryId
  } = use(NavigatorActionsContext)
  const {
    value: activeValue,
    activeSecondary,
    collected,
    showList
  } = use(NavigatorSelectionContext)
  const { overflowOpen, openMenu } = use(NavigatorDisclosureContext)
  const { expanded } = use(NavigatorExpansionContext)
  const { navCollapsed, tabBar } = use(NavigatorBarContext)
  const tabTrackRef = useRef<HTMLDivElement>(null)
  const clusterRef = useRef<HTMLDivElement>(null)
  const clusterTrackRef = useRef<HTMLDivElement>(null)
  const pinnedRef = useRef<HTMLDivElement>(null)
  const brandRef = useRef<HTMLDivElement>(null)

  // Root's walk: a Primary that isn't its direct child finds nothing, and warns.
  const items = collected.ordered

  const slots = useMemo(
    () => deriveMobileSlots(collected.automatic, collected.pinnedSlots),
    [collected]
  )

  useEffect(() => {
    // An open menu is the topmost layer; its own Escape closes it first.
    if (!overflowOpen || openMenu !== null) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOverflowOpen(false)
      overflowOpenerRef.current?.focus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [overflowOpen, openMenu, setOverflowOpen, overflowOpenerRef])

  useDevWarning(
    !primaryDerived &&
      '[Roadie] Navigator.Primary must be a direct child of Navigator; secondary navs and More need it there.'
  )

  useDevWarning(
    collected.hasStrayChild &&
      '[Roadie] Navigator.Primary skipped a child it does not recognise. Render Navigator.Item directly; see COMPOUND_PATTERNS.md §1.2.'
  )
  const routeless = items
    .filter(
      (slot) => slot.descendants.length > 0 && slot.declaredHref === undefined
    )
    .map((slot) => slot.value)
    .join(', ')
  useDevWarning(
    routeless !== '' &&
      `[Roadie] Navigator.Item ${routeless} has a Navigator.Secondary but no href.`
  )

  // Masks `navCollapsed` rather than resetting it, so `auto` snaps back to the state it hid.
  const collapsed = navCollapsed && tabBar === 'auto'
  const navHidden = tabBar === 'hidden'

  const folded = slots.overflow
  const hasMore = folded.length > 0
  const pinnedTab = slots.pinned
  const foldedIsActive = folded.some((slot) =>
    isDestinationActive(slot, activeValue)
  )
  const pinnedIsActive =
    pinnedTab !== undefined && isDestinationActive(pinnedTab, activeValue)
  // An open disclosure takes the pill from every route tab; only More also takes aria-current.
  const disclosureOpen = overflowOpen || openMenu !== null
  // The pinned circle already sits at the trailing edge, so it is the end circle.
  const activeIsEnd = pinnedTab ? pinnedIsActive : hasMore && foldedIsActive
  // With the pinned circle at the end, an active folded item makes More the start circle.
  const moreCircleSide = !pinnedTab
    ? 'end'
    : foldedIsActive && !pinnedIsActive
      ? 'start'
      : undefined
  const tabCount = slots.tabs.length + (hasMore ? 1 : 0)

  const foldedSignature = slotsSignature(folded)
  const publishFolded = useEffectEvent(() =>
    setOverflowItems('horizontal', folded)
  )
  useEffect(() => {
    publishFolded()
  }, [foldedSignature])

  const hasToggle = collected.toggles.length > 0
  const clusterCapsules = useMemo(
    () => primaryCapsules(collected.cluster),
    [collected.cluster]
  )
  const { folded: verticalFolded, shown: verticalShown } = usePrimaryCapacity(
    clusterRef,
    brandRef,
    clusterCapsules,
    hasToggle && !expanded ? PRIMARY_METRICS.toggleRow : 0,
    !expanded
  )
  const verticalFoldedSlots = collected.automatic.filter((slot) =>
    verticalFolded.has(slot.value)
  )
  const verticalFoldedSignature = slotsSignature(verticalFoldedSlots)
  const publishVerticalFolded = useEffectEvent(() =>
    setOverflowItems('vertical', verticalFoldedSlots)
  )
  useEffect(() => {
    publishVerticalFolded()
  }, [verticalFoldedSignature])

  // Once the navigation in view folds nothing, no More control is left to close More.
  const shownFolded = verticalShown ? verticalFoldedSlots.length : folded.length
  useEffect(() => {
    if (overflowOpen && shownFolded === 0) setOverflowOpen(false)
  }, [overflowOpen, shownFolded, setOverflowOpen])
  const verticalMoreActive =
    overflowOpen ||
    (verticalFoldedSlots.some((slot) =>
      isDestinationActive(slot, activeValue)
    ) &&
      !disclosureOpen)

  const selectMore = (event: MouseEvent) => {
    if (event.currentTarget instanceof HTMLElement) {
      overflowOpenerRef.current = event.currentTarget
    }
    setOpenMenu(null)
    if (!overflowOpen) {
      setOverflowOpen(true)
      return
    }
    scrollActivePaneToTop()
  }

  const verticalMoreTile = (
    <NavigatorDestination
      ariaCurrent={verticalMoreActive ? 'true' : undefined}
      dataCurrent={verticalMoreActive}
      aria-expanded={overflowOpen}
      aria-controls={overflowOpen ? overflowPaneId : undefined}
      className={navigatorItemVariants({
        active: verticalMoreActive
      })}
      onClick={selectMore}
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

  // By hand: the compiler leaves the tab list unmemoised, and tabs are uncompiled.
  const { tabs, pinned } = useMemo(() => {
    // Without `onShowListChange`, the tab's href already leads to its route.
    const selectDestination = (
      event: MouseEvent,
      tab: NavigatorSlotMeta,
      active: boolean,
      href: string | undefined
    ) => {
      activateItem(tab.value)
      if (opensElsewhere(event)) return
      setOpenMenu(null)
      // A tap that stays on this route closes More now; one that navigates leaves it to the route.
      const stay = () => {
        event.preventDefault()
        setOverflowOpen(false)
      }
      const go = () => {
        if (href === undefined) setOverflowOpen(false)
        else closeOverflowOnRoute()
      }
      if (!active) {
        go()
        setValue(tab.value)
        return
      }
      const expandBar = () => {
        setPinExpanded(true)
        setNavCollapsed(false)
      }
      const ownsSecondary = activeSecondary?.value === tab.value
      const onDestinationRoute = isActiveValue(tab.value, activeValue)
      const hasOverview = ownsSecondary && activeSecondary?.overview === true
      if (ownsSecondary && onDestinationRoute) {
        stay()
        if (collapsed) expandBar()
        scrollActivePaneToTop()
        return
      }
      if (collapsed) {
        stay()
        expandBar()
        return
      }
      if (
        ownsSecondary &&
        !hasOverview &&
        onShowListChange &&
        !onDestinationRoute
      ) {
        stay()
        onShowListChange(!showList)
        return
      }
      if (hasOverview) {
        go()
        setValue(tab.value)
        return
      }
      if (isActiveValue(tab.topValue, activeValue)) {
        stay()
        scrollActivePaneToTop()
        return
      }
      if (tab.href === undefined) {
        stay()
        setValue(tab.topValue)
        return
      }
      go()
    }

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
              onClick={() => {
                activateItem(tab.value)
                setOverflowOpen(false)
              }}
            />
          }
        />
      ) : (
        <NavigatorTab key={tab.value} {...tabProps} />
      )

    const tabs = slots.tabs.map((tab, tabIndex) => {
      const active = isDestinationActive(tab, activeValue)
      const href = tab.href
      // With the end circle taken, the first tab floats to the start so two circles always show.
      const isStartCircle = activeIsEnd
        ? tab.value === slots.tabs[0]?.value
        : active
      return renderTab(tab, {
        label: tab.label,
        icon: tab.icon,
        badge: tab.badge,
        href,
        active: active && !disclosureOpen,
        current: active && !overflowOpen,
        isPage: isActiveValue(tab.value, activeValue),
        collapsed,
        circleSide: isStartCircle ? 'start' : undefined,
        index: tabIndex,
        onClick: (event) => selectDestination(event, tab, active, href)
      })
    })
    const pinnedHref = pinnedTab?.href
    const pinned = pinnedTab
      ? renderTab(pinnedTab, {
          label: pinnedTab.label,
          icon: pinnedTab.icon,
          badge: pinnedTab.badge,
          href: pinnedHref,
          active: pinnedIsActive && !disclosureOpen,
          current: pinnedIsActive && !overflowOpen,
          isPage: isActiveValue(pinnedTab.value, activeValue),
          pinned: true,
          collapsed,
          index: 0,
          onClick: (event) =>
            selectDestination(event, pinnedTab, pinnedIsActive, pinnedHref)
        })
      : null
    return { tabs, pinned }
  }, [
    slots.tabs,
    pinnedTab,
    pinnedIsActive,
    activeValue,
    activeIsEnd,
    activeSecondary,
    disclosureOpen,
    overflowOpen,
    openMenu,
    collapsed,
    showList,
    onShowListChange,
    activateItem,
    setOverflowOpen,
    closeOverflowOnRoute,
    setOpenMenu,
    setValue,
    setPinExpanded,
    setNavCollapsed,
    scrollActivePaneToTop
  ])

  return (
    <>
      <nav
        id={primaryId}
        data-slot='navigator-primary'
        data-orientation='vertical'
        data-expanded={expanded ? '' : undefined}
        data-from-document={expandedFromDocument ? '' : undefined}
        aria-label={ariaLabel}
        className={cn(navigatorPrimaryVerticalClass, className)}
      >
        <div
          data-slot='navigator-primary-frame'
          className={navigatorPrimaryFrameClass}
        >
          <Tooltip.Provider>
            {collected.brand.length > 0 || collected.toggles.length > 0 ? (
              <div
                ref={brandRef}
                data-slot='navigator-primary-brand'
                className={navigatorPrimaryBrandVariants({ toggle: hasToggle })}
              >
                {collected.brand}
                {collected.toggles}
              </div>
            ) : null}
            <ScrollArea
              data-slot='navigator-primary-cluster'
              className={navigatorPrimaryClusterClass}
            >
              <ScrollArea.Viewport
                ref={clusterRef}
                data-slot='navigator-primary-cluster-viewport'
                className={navigatorPrimaryClusterViewportClass}
              >
                <ScrollArea.Content
                  fitWidth={false}
                  className={navigatorPrimaryClusterContentClass}
                >
                  <div
                    ref={clusterTrackRef}
                    data-slot='navigator-primary-cluster-track'
                    className={navigatorPrimaryClusterTrackClass}
                  >
                    <NavigatorFoldedContext value={verticalFolded}>
                      {wrapCapsules(collected.cluster, verticalFolded)}
                    </NavigatorFoldedContext>
                    {verticalFoldedSlots.length > 0 ? (
                      <ul
                        data-slot='navigator-capsule'
                        className={navigatorCapsuleClass}
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
                    <NavigatorIndicator
                      trackRef={clusterTrackRef}
                      surface='vertical'
                    />
                  </div>
                </ScrollArea.Content>
              </ScrollArea.Viewport>
              <ScrollArea.Scrollbar flush>
                <ScrollArea.Thumb />
              </ScrollArea.Scrollbar>
            </ScrollArea>
            {collected.pinned.length > 0 ? (
              <div
                ref={pinnedRef}
                data-slot='navigator-primary-pinned'
                className={navigatorPrimaryPinnedClass}
              >
                {wrapCapsules(collected.pinned, new Set())}
                <NavigatorIndicator trackRef={pinnedRef} surface='vertical' />
              </div>
            ) : null}
          </Tooltip.Provider>
        </div>
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
            )
          } as CSSProperties
        }
        // `aria-hidden` too: `inert` alone doesn't leave every AT tree.
        inert={navHidden}
        aria-hidden={navHidden || undefined}
        className={navigatorPrimaryHorizontalVariants({
          hidden: navHidden,
          pinned: pinnedTab !== undefined
        })}
      >
        <div
          data-slot='navigator-primary-lane'
          className={navigatorPrimaryLaneClass}
        >
          <div
            ref={tabTrackRef}
            data-slot='navigator-primary-track'
            className={navigatorPrimaryTrackVariants({
              collapsed,
              pinned: pinnedTab !== undefined
            })}
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
            {tabs}
            {hasMore ? (
              <NavigatorTab
                label={OVERFLOW_LABEL}
                icon={<DotsThreeIcon />}
                active={overflowOpen || (foldedIsActive && !disclosureOpen)}
                current={overflowOpen || foldedIsActive}
                collapsed={collapsed}
                circleSide={moreCircleSide}
                index={slots.tabs.length}
                aria-expanded={overflowOpen}
                aria-controls={overflowOpen ? overflowPaneId : undefined}
                onClick={selectMore}
              />
            ) : null}
          </div>
        </div>
        {pinnedTab ? (
          <div
            data-slot='navigator-primary-circle'
            className={navigatorPrimaryCircleClass}
          >
            {pinned}
          </div>
        ) : null}
      </nav>
    </>
  )
}

NavigatorPrimary.displayName = 'Navigator.Primary'
