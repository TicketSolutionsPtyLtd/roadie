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
import {
  NavigatorContext,
  isActiveValue,
  isBranchActive,
  isSectionActive
} from './NavigatorContext'
import { NavigatorGroup } from './NavigatorGroup'
import { NavigatorIndicator } from './NavigatorIndicator'
import { NavigatorItem, type NavigatorItemProps } from './NavigatorItem'
import type { NavigatorSecondaryProps } from './NavigatorSecondary'
import { NavigatorTab } from './NavigatorTab'
import { collectSlots } from './collectSlots'
import {
  type MobileSlots,
  type NavigatorSlotMeta,
  OVERFLOW_LABEL,
  deriveMobileSlots
} from './mobileSlots'
import { wrapPrimaryRun } from './primaryList'
import { activeHref, rememberedHref } from './sectionMemory'
import { secondaryDescendantValues, splitItemChildren } from './splitSecondary'
import {
  navigatorPrimaryCircleVariants,
  navigatorPrimaryContentVariants,
  navigatorPrimaryHorizontalVariants,
  navigatorPrimaryPillVariants,
  navigatorPrimaryPinnedVariants,
  navigatorPrimaryTrackVariants,
  navigatorPrimaryVerticalVariants,
  navigatorPrimaryViewportVariants
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
    setHasNesting,
    setSecondaryNav,
    navCollapsed,
    setNavCollapsed,
    primaryNav,
    setPinExpanded,
    scrollActivePaneToTop,
    overflowOpen,
    setOverflowOpen,
    overflowPaneId,
    setOverflowItems,
    hasContent,
    openPanel,
    setOpenPanel,
    setPanelItems,
    sectionMemory,
    rememberSection
  } = use(NavigatorContext)
  const tabTrackRef = useRef<HTMLDivElement>(null)
  // The viewport, not the `<nav>`: it is what scrolls.
  const verticalRef = useRef<HTMLDivElement>(null)

  const collected = useMemo(() => collectSlots(children), [children])
  const items = [...collected.automatic, ...collected.pinnedSlots]
  const nests = items.some((slot) => slot.descendants.length > 0)

  // Only a destination deeper than the branch-active section's landing is worth remembering.
  const branchSection = items.find((item) => isSectionActive(item, activeValue))
  const branchValue = branchSection?.value
  const deepHref =
    branchValue !== undefined && activeValue !== branchValue
      ? activeHref(activeValue, undefined)
      : undefined

  useEffect(() => {
    if (branchValue === undefined || deepHref === undefined) return
    rememberSection(branchValue, deepHref)
  }, [branchValue, deepHref, rememberSection])

  const activeSecondary = useMemo(() => {
    let active: NavigatorSecondaryProps | undefined

    const visitItem = (child: ReactElement) => {
      const itemProps = child.props as NavigatorItemProps
      const { secondary } = splitItemChildren(itemProps.children)
      const branchActive = isBranchActive(
        itemProps.value,
        secondaryDescendantValues(secondary),
        activeValue
      )
      if (!branchActive) return

      const [nested] = secondary
      if (!isValidElement<NavigatorSecondaryProps>(nested)) return
      active ??= nested.props
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
    setHasNesting(nests)
  }, [nests, setHasNesting])

  useEffect(() => {
    if (!overflowOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOverflowOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [overflowOpen, setOverflowOpen])

  useEffect(() => {
    if (openPanel === null) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenPanel(null)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [openPanel, setOpenPanel])

  useEffect(() => {
    setSecondaryNav(
      activeSecondary
        ? {
            'aria-label': activeSecondary['aria-label'],
            className: activeSecondary.className,
            children: activeSecondary.children
          }
        : null
    )
  }, [activeSecondary, setSecondaryNav])

  // Warnings live in effects, not the walk: React 19 StrictMode double-invokes render.
  const hasStrayChild = collected.hasStrayChild
  useEffect(() => {
    if (!isDev() || !hasStrayChild) return
    console.warn(
      '[Roadie] Navigator.Primary only recognises Navigator.Item, ' +
        'Navigator.Group and Navigator.Brand by direct element-type ' +
        'reference, and skipped a child that is not one of those. A ' +
        'component that renders, or merely returns, a Navigator.Item — ' +
        'including one extracted to share it across sections — is not that ' +
        'reference either, so it is invisible the same way. Fragments, ' +
        'mapped wrappers, and trees authored in a server component (Flight ' +
        'replaces each element type with a lazy reference) fail for the ' +
        'same reason. Render Navigator.Item directly as a child. See ' +
        'COMPOUND_PATTERNS.md §1.2.'
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

  const form = nests ? 'nested' : 'compact'

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
  // An open disclosure takes currency from every route tab until it closes.
  const disclosureOpen = overflowOpen || openPanel !== null
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
    setOverflowItems(folded)
  }, [foldedKey, setOverflowItems])

  const panelSlots = items.filter((slot) => slot.panel)
  const panelKey = panelSlots.map((slot) => slot.value).join(',')
  useEffect(() => {
    setPanelItems(panelSlots)
  }, [panelKey, setPanelItems])

  const foldedWithNoHost = hasMore && !hasContent
  useEffect(() => {
    if (!isDev() || !foldedWithNoHost) return
    console.warn(
      '[Roadie] Navigator.Primary folded items into a More tab, but no ' +
        'Navigator.Content is mounted to host the overflow pane. The ' +
        'folded destinations are unreachable below `md`. Render a ' +
        'Navigator.Content, optionally with a Navigator.Overflow inside it.'
    )
  }, [foldedWithNoHost])

  // Tapping the active tab: collapsed, it reopens the bar; on the landing, it
  // scrolls to top; on a sub-page, its href already points up to the landing.
  const selectDestination = (
    event: MouseEvent,
    tab: NavigatorSlotMeta,
    active: boolean
  ) => {
    setOverflowOpen(false)
    if (tab.panel) {
      event.preventDefault()
      setOpenPanel(openPanel === tab.value ? null : tab.value)
      return
    }
    setOpenPanel(null)
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

  return (
    <>
      <ScrollArea
        // `ScrollAreaRoot` hard-codes `role: 'presentation'`, which would
        // otherwise stick to this landmark.
        render={(renderProps) => <nav {...renderProps} role={undefined} />}
        data-slot='navigator-primary'
        data-orientation='vertical'
        data-form={form}
        aria-label={ariaLabel}
        className={cn(navigatorPrimaryVerticalVariants({ form }), className)}
      >
        <ScrollArea.Viewport
          ref={verticalRef}
          data-slot='navigator-primary-viewport'
          className={navigatorPrimaryViewportVariants()}
        >
          {/* Wrapped so the bar re-measures as sections expand and collapse —
              the viewport's own box never changes. */}
          <ScrollArea.Content
            fitWidth={false}
            className={navigatorPrimaryContentVariants()}
          >
            {wrapPrimaryRun([
              ...collected.brand,
              ...collected.cluster.map((entry) => entry.element)
            ])}
            {collected.pinned.length > 0 ? (
              <div
                data-slot='navigator-primary-pinned'
                className={navigatorPrimaryPinnedVariants()}
              >
                {wrapPrimaryRun(collected.pinned.map((entry) => entry.element))}
              </div>
            ) : null}
          </ScrollArea.Content>
          <NavigatorIndicator trackRef={verticalRef} surface='vertical' />
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar flush>
          <ScrollArea.Thumb />
        </ScrollArea.Scrollbar>
      </ScrollArea>
      <nav
        data-slot='navigator-primary'
        data-orientation='horizontal'
        data-collapsed={String(collapsed)}
        data-hidden={String(navHidden)}
        aria-label={`${ariaLabel} tabs`}
        style={
          {
            '--navigator-primary-count': String(tabCount),
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
            const active = tab.panel
              ? openPanel === tab.value
              : isSectionActive(tab, activeValue)
            const visualActive = tab.panel ? active : active && !disclosureOpen
            // With the right circle taken, the first tab floats left so two circles always show.
            const isLeftCircle = activeIsRight
              ? tab.value === slots.tabs[0]?.value
              : active
            return (
              <NavigatorTab
                key={tab.value}
                label={tab.label}
                icon={tab.icon}
                href={rememberedHref(
                  sectionMemory,
                  tab.value,
                  tab.href,
                  active
                )}
                active={visualActive}
                isPage={isActiveValue(tab.value, activeValue)}
                collapsed={collapsed}
                circleSide={isLeftCircle ? 'left' : undefined}
                index={tabIndex}
                expanded={tab.panel ? active : undefined}
                onSelect={(event) => selectDestination(event, tab, active)}
              />
            )
          })}
          {hasMore ? (
            <NavigatorTab
              label={OVERFLOW_LABEL}
              icon={<DotsThreeIcon />}
              active={overflowOpen || (foldedIsActive && !disclosureOpen)}
              collapsed={collapsed}
              circleSide={moreCircleSide}
              index={slots.tabs.length}
              expanded={overflowOpen}
              controls={overflowOpen ? overflowPaneId : undefined}
              onSelect={() => {
                setOpenPanel(null)
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
            <NavigatorTab
              label={pinnedTab.label}
              icon={pinnedTab.icon}
              href={
                pinnedTab.panel
                  ? undefined
                  : rememberedHref(
                      sectionMemory,
                      pinnedTab.value,
                      pinnedTab.href,
                      pinnedIsActive
                    )
              }
              active={
                pinnedTab.panel
                  ? openPanel === pinnedTab.value
                  : pinnedIsActive && !disclosureOpen
              }
              isPage={isActiveValue(pinnedTab.value, activeValue)}
              pinned
              index={0}
              expanded={
                pinnedTab.panel ? openPanel === pinnedTab.value : undefined
              }
              onSelect={(event) =>
                selectDestination(event, pinnedTab, pinnedIsActive)
              }
            />
          </div>
        ) : null}
      </nav>
    </>
  )
}

NavigatorPrimary.displayName = 'Navigator.Primary'
