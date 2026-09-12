'use client'

import {
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
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
  NavigatorContext,
  isActiveValue,
  isSectionActive
} from './NavigatorContext'
import { NavigatorDestination } from './NavigatorDestination'
import { NavigatorFoldedContext } from './NavigatorFoldedContext'
import { NavigatorIndicator } from './NavigatorIndicator'
import { NavigatorMenuHost, menuId } from './NavigatorMenuHost'
import { NavigatorTab, type NavigatorTabProps } from './NavigatorTab'
import { NavigatorTileTooltip } from './NavigatorTileTooltip'
import { primaryCapsules, wrapCapsules } from './capsules'
import { collectSlots } from './collectSlots'
import {
  type NavigatorSlotMeta,
  OVERFLOW_LABEL,
  deriveMobileSlots,
  phoneBarCapacity
} from './mobileSlots'
import { presentNavIcon } from './presentNavIcon'
import { PRIMARY_METRICS } from './primaryCapacity'
import { activeHref, rememberedHref } from './sectionMemory'
import { textOf } from './splitSecondary'
import { usePrimaryCapacity } from './usePrimaryCapacity'
import {
  navigatorCapsuleVariants,
  navigatorItemLabelClass,
  navigatorItemVariants,
  navigatorPrimaryBrandVariants,
  navigatorPrimaryCircleVariants,
  navigatorPrimaryClusterContentVariants,
  navigatorPrimaryClusterTrackVariants,
  navigatorPrimaryClusterVariants,
  navigatorPrimaryClusterViewportVariants,
  navigatorPrimaryHorizontalVariants,
  navigatorPrimaryLaneVariants,
  navigatorPrimaryPillVariants,
  navigatorPrimaryPinnedVariants,
  navigatorPrimaryTrackVariants,
  navigatorPrimaryVerticalVariants
} from './variants'

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
    activeSection,
    setPrimaryChildren,
    primaryDerived,
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
  const clusterTrackRef = useRef<HTMLDivElement>(null)
  const pinnedRef = useRef<HTMLDivElement>(null)
  const brandRef = useRef<HTMLDivElement>(null)

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

  // Root reads a direct child's children itself; only a wrapped Primary has to publish them.
  useEffect(() => {
    if (!primaryDerived) setPrimaryChildren(children)
  }, [primaryDerived, children, setPrimaryChildren])

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

  const brandless = collected.brand.length === 0
  useEffect(() => {
    if (!isDev() || !brandless) return
    console.warn(
      '[Roadie] Navigator.Primary has no Navigator.Brand. The vertical ' +
        'navigation expects one at its top — a mark linking home, which ' +
        'Navigator.ExpandToggle sits beside. Add a Navigator.Brand as a ' +
        'direct child; a Brand inside a Fragment or wrapper is skipped.'
    )
  }, [brandless])

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
  // The pinned circle already sits at the trailing edge, so it is the end circle.
  const activeIsEnd = pinnedTab ? pinnedIsActive : hasMore && foldedIsActive
  // With the pinned circle at the end, an active folded item makes More the start circle.
  const moreCircleSide = !pinnedTab
    ? 'end'
    : foldedIsActive && !pinnedIsActive
      ? 'start'
      : undefined
  const tabCount = slots.tabs.length + (hasMore ? 1 : 0)

  // `folded` is a fresh array every render; its key is the stable identity.
  const foldedKey = folded.map((slot) => slot.value).join(',')
  useEffect(() => {
    setOverflowItems('horizontal', folded)
  }, [foldedKey, setOverflowItems])

  const hasToggle = collected.toggles.length > 0
  const { folded: verticalFolded, shown: verticalShown } = usePrimaryCapacity(
    clusterRef,
    brandRef,
    primaryCapsules(collected.cluster),
    hasToggle && !expanded ? PRIMARY_METRICS.toggleRow : 0,
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

  // Once the navigation in view folds nothing, no More control is left to close More.
  const shownFoldedKey = verticalShown ? verticalFoldedKey : foldedKey
  useEffect(() => {
    if (overflowOpen && shownFoldedKey === '') setOverflowOpen(false)
  }, [overflowOpen, shownFoldedKey, setOverflowOpen])
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
    tab.onClick?.()
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
    const pageRoot = ownsSection && activeSection?.root === 'page'
    if (ownsSection && !pageRoot && onShowListChange && !onSectionRoute) {
      event.preventDefault()
      onShowListChange(!showList)
      return
    }
    if (ownsSection && onSectionRoute) {
      event.preventDefault()
      scrollActivePaneToTop()
      return
    }
    if (pageRoot) {
      setValue(tab.value)
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
            onClick={() => {
              tab.onClick?.()
              setOverflowOpen(false)
            }}
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
                <div
                  ref={clusterTrackRef}
                  data-slot='navigator-primary-cluster-track'
                  className={navigatorPrimaryClusterTrackVariants()}
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
            )
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
          data-slot='navigator-primary-lane'
          className={navigatorPrimaryLaneVariants()}
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
              // With the end circle taken, the first tab floats to the start so two circles always show.
              const isStartCircle = activeIsEnd
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
                circleSide: isStartCircle ? 'start' : undefined,
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
              collapsed,
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
