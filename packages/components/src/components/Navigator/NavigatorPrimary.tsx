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

import { ListIcon } from '@phosphor-icons/react'

import { cn } from '@oztix/roadie-core/utils'

import { isDev } from '../../utils/isDev'
import { ScrollArea } from '../ScrollArea'
import { NavigatorBrand } from './NavigatorBrand'
import {
  NavigatorContext,
  isActiveValue,
  isBranchActive,
  isSectionActive
} from './NavigatorContext'
import { NavigatorEnd } from './NavigatorEnd'
import { NavigatorGroup } from './NavigatorGroup'
import { NavigatorIndicator } from './NavigatorIndicator'
import { NavigatorItem, type NavigatorItemProps } from './NavigatorItem'
import type { NavigatorSecondaryProps } from './NavigatorSecondary'
import { NavigatorTab } from './NavigatorTab'
import {
  type MobileSlots,
  type NavigatorSlotMeta,
  type NavigatorTabSlots,
  deriveMobileSlots
} from './mobileSlots'
import { wrapRailRun } from './railList'
import { activeHref, rememberedHref } from './sectionMemory'
import {
  firstSecondaryHref,
  firstSecondaryValue,
  secondaryDescendantValues,
  splitItemChildren
} from './splitSecondary'
import {
  navigatorRailContentVariants,
  navigatorRailVariants,
  navigatorRailViewportVariants,
  navigatorTabBarPillVariants,
  navigatorTabBarTrackVariants,
  navigatorTabBarVariants
} from './variants'

// Re-exported so existing imports of these types/values from
// `./NavigatorPrimary` keep working — the derivation itself lives in
// `./mobileSlots` so it doesn't share a file (and confuse
// `react-docgen-typescript`) with the `NavigatorPrimary` component.
export type { MobileSlots, NavigatorSlotMeta, NavigatorTabSlots }
export { deriveMobileSlots }

const toSlotMeta = (props: NavigatorItemProps): NavigatorSlotMeta => {
  const {
    label,
    secondary,
    panel: declaredPanel
  } = splitItemChildren(props.children)
  // Navigation outranks a menu: a Secondary makes the item a section
  // regardless of a Panel also being declared — NavigatorItem warns and
  // ignores the Panel the same way.
  const panel = secondary.length > 0 ? null : declaredPanel
  // A panel makes the item a disclosure: it owns a menu, not a destination.
  const href = panel ? undefined : (props.href ?? firstSecondaryHref(secondary))
  return {
    value: props.value,
    label,
    icon: props.icon,
    // A section without its own route (no `href`) links to its first
    // sub-page, same as the rail's `NavigatorItem` — so its mobile tab works.
    href,
    panel,
    // Its landing is itself when routed; otherwise the sub-page its href
    // points at, so tap-behaviour can tell "on the landing" from "on a sub-page".
    topValue:
      props.href !== undefined
        ? props.value
        : (firstSecondaryValue(secondary) ?? props.value),
    descendants: secondaryDescendantValues(secondary)
  }
}

export type NavigatorPrimaryProps = {
  /** Names the navigation landmark, e.g. 'Primary'. */
  'aria-label': string
  className?: string
  children?: ReactNode
  /**
   * Which items take the tab-bar slots below `md`, in tab order. Omit and the
   * bar uses source order, folding the tail past four into More — exactly as
   * it does today. Provide it when rail order is chosen for the rail and the
   * bar deserves its own answer: the named values become the tabs, and
   * everything else folds into the overflow.
   *
   * Four is the cap because the fifth slot is More. The tuple union makes
   * that a compile-time error.
   */
  tabs?:
    | readonly [string]
    | readonly [string, string]
    | readonly [string, string, string]
    | readonly [string, string, string, string]
}

export function NavigatorPrimary({
  'aria-label': ariaLabel,
  className,
  children,
  tabs
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
  // The tabs' hugging row, not the bar: the indicator's geometry has to
  // resolve against the box that actually tracks the tabs' width.
  const tabTrackRef = useRef<HTMLDivElement>(null)
  // Points at the rail's ScrollArea Viewport, not its `<nav>` root: the
  // viewport is what actually scrolls, and `useSlidingIndicator` reads
  // `scrollLeft`/`scrollTop` off whatever `trackRef` points at.
  const railRef = useRef<HTMLDivElement>(null)

  const { items, endItems, nests, hasStrayChild } = useMemo(() => {
    const items: NavigatorSlotMeta[] = []
    const endItems: NavigatorSlotMeta[] = []
    let foundNesting = false
    let foundStray = false

    const visitItem = (child: ReactElement) => {
      const itemProps = child.props as NavigatorItemProps
      items.push(toSlotMeta(itemProps))
      const { secondary } = splitItemChildren(itemProps.children)
      if (secondary.length > 0) foundNesting = true
    }

    Children.forEach(children, (child) => {
      if (!isValidElement(child)) return

      // Rendered at the top of the rail (author order) but never a
      // destination — skip it so it doesn't count toward nesting or tabs.
      if (child.type === NavigatorBrand) return

      if (child.type === NavigatorEnd) {
        const endProps = child.props as { children?: ReactNode }
        Children.forEach(endProps.children, (endChild) => {
          if (!isValidElement(endChild)) return
          if (endChild.type === NavigatorItem) {
            endItems.push(toSlotMeta(endChild.props as NavigatorItemProps))
            return
          }
          foundStray = true
        })
        return
      }

      // A deliberate, single-type exception to the one-level rule, matching
      // `secondaryItems`: Group is matched by reference exactly as Item is, so
      // the walk stays immune to everything except server-authored trees. It
      // is NOT a licence for arbitrary wrappers.
      if (child.type === NavigatorGroup) {
        const groupProps = child.props as { children?: ReactNode }
        Children.forEach(groupProps.children, (grandChild) => {
          if (isValidElement(grandChild) && grandChild.type === NavigatorItem) {
            visitItem(grandChild)
          }
        })
        return
      }

      if (child.type !== NavigatorItem) {
        foundStray = true
        return
      }

      visitItem(child)
    })

    return { items, endItems, nests: foundNesting, hasStrayChild: foundStray }
  }, [children])

  // Recorded from an effect, not the walk: this is a write to shared state
  // during render otherwise, and React 19 double-invokes render in StrictMode.
  //
  // Only the branch-active section records, and only a destination deeper than
  // its own landing — a section sitting at its landing has nothing to remember.
  //
  // A panel item is excluded even when a route mounted beneath its value
  // makes `isBranchActive` true via the prefix clause — it owns a menu, not
  // a destination, and must never become a memory key or its tab picks up a
  // stale href after the click handler's `preventDefault` no longer applies
  // (middle-click, copy-link-address).
  const branchSection = items.find((item) => isSectionActive(item, activeValue))
  const branchValue = branchSection?.value
  // The declared href of the active descendant is not on the slot meta —
  // `descendants` is values only — so the value itself is the target, which
  // is what the design says to store. `activeHref` refuses a value that is
  // not path-shaped rather than producing a broken link.
  const deepHref =
    branchValue !== undefined && activeValue !== branchValue
      ? activeHref(activeValue, undefined)
      : undefined

  useEffect(() => {
    if (branchValue === undefined || deepHref === undefined) return
    rememberSection(branchValue, deepHref)
  }, [branchValue, deepHref, rememberSection])

  // Re-walked rather than folded into the memo above: the derivation that
  // shapes the rail and tab bar is deliberately independent of which item is
  // active, and the hoisted section nav is the one thing that isn't.
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

  const slots = deriveMobileSlots(items, endItems, tabs)

  useEffect(() => {
    setHasNesting(nests)
  }, [nests, setHasNesting])

  // Escape still dismisses; there is no outside-click any more — from Task 5
  // the overflow is a full-screen pane, not a popup floating over the bar.
  useEffect(() => {
    if (!overflowOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOverflowOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [overflowOpen, setOverflowOpen])

  // Same contract for an open panel: it's now a full-screen pane below `md`
  // rather than a Drawer, so it no longer gets Escape for free from Base UI.
  useEffect(() => {
    if (openPanel === null) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenPanel(null)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [openPanel, setOpenPanel])

  // Lifted to context so the top pane's header — which lives in a different
  // subtree — can render the active section's nav as the mobile nav row. An
  // effect, not the walk, for the same StrictMode reason.
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

  // In an effect, not the walk: React 19 strict mode double-invokes render.
  useEffect(() => {
    if (!isDev() || !hasStrayChild) return
    console.warn(
      '[Roadie] Navigator.Primary and Navigator.End only recognise ' +
        'Navigator.Item by direct element-type reference — Navigator.Primary ' +
        'also recognises Navigator.Group, but Navigator.End does not — and ' +
        'skipped a child that is not one of those. A component that ' +
        'renders, or merely returns, a Navigator.Item — including one ' +
        'extracted to share it across sections — is not that reference ' +
        'either, so it is invisible the same way. Fragments, mapped ' +
        'wrappers, and trees authored in a server component (Flight ' +
        'replaces each element type with a lazy reference) fail for the ' +
        'same reason. Render Navigator.Item directly as a child. See ' +
        'COMPOUND_PATTERNS.md §1.2.'
    )
  }, [hasStrayChild])

  // In an effect, not the walk: React 19 strict mode double-invokes render.
  // Loud because this is the one real cost of naming values away from the
  // items they refer to — a typo silently drops a destination from the bar,
  // and a repeat silently collapses to its first occurrence.
  const unknownTabs = slots.unknownTabs.join(', ')
  const repeatedTabs = slots.repeatedTabs.join(', ')
  const overflowTabs = slots.overflowTabs.join(', ')
  useEffect(() => {
    if (
      !isDev() ||
      (unknownTabs === '' && repeatedTabs === '' && overflowTabs === '')
    )
      return
    const problems: string[] = []
    if (unknownTabs !== '') {
      problems.push(
        `names ${unknownTabs}, which is not a declared Navigator.Item ` +
          'value — that slot is dropped'
      )
    }
    if (repeatedTabs !== '') {
      problems.push(
        `repeats ${repeatedTabs} after its first occurrence — the repeat ` +
          'is ignored'
      )
    }
    if (overflowTabs !== '') {
      problems.push(
        `names more tabs than the bar can hold (${overflowTabs}) — only ` +
          'the first four are kept, and the rest fold into the final tab'
      )
    }
    console.warn(
      `[Roadie] Navigator.Primary's \`tabs\` ${problems.join('; and ')}. ` +
        'Note that items authored in a server component are invisible to ' +
        'the walk — see COMPOUND_PATTERNS.md §1.2.'
    )
  }, [unknownTabs, repeatedTabs, overflowTabs])

  const form = nests ? 'nested' : 'compact'

  // `visible` means the bar stays full whatever scroll position a sibling pane
  // left in shared state; `hidden` takes the bar out, so collapse is moot.
  // This masks `navCollapsed` rather than resetting it — a top pane that flips
  // from `visible` back to `auto` snaps straight back to the state it was
  // hiding.
  const collapsed = navCollapsed && primaryNav === 'auto'
  const navHidden = primaryNav === 'hidden'

  const folded = [...slots.overflow, ...slots.end]
  // A final tab holding one End destination is that destination. Anything
  // that folded out of the rail needs somewhere to live, so it discloses —
  // including a single item, because declaring `tabs` declares the whole
  // membership and an unnamed item is not a tab.
  const generatesPane = folded.length > 1 || slots.overflow.length > 0
  // The destination branch runs only when the sole folded slot is an End
  // item — any rail overflow, alone or not, takes the disclosure branch above.
  const soleFolded = folded[0]
  const foldedIsActive = folded.some((slot) =>
    isSectionActive(slot, activeValue)
  )
  // Any open disclosure — the overflow pane or a panel — supersedes route
  // currency: exactly one tab reads as current, the open disclosure, until
  // it closes and the route reclaims its pill. `overflowOpen` and `openPanel`
  // are two instances of the same rule, so they resolve to one flag here
  // rather than two `&&` clauses scattered across the branches below.
  const disclosureOpen = overflowOpen || openPanel !== null
  const hasFinalTab = slots.label !== undefined
  // Left circle is the active tab, unless the active tab is the final/End tab —
  // then the first tab takes the left so two circles always show.
  const activeIsFinal = hasFinalTab && foldedIsActive
  // How many grid columns the bar's track ends up with. The collapsed
  // circles' travel is derived from it in CSS — see `navigatorTabBarVariants`.
  const tabCount = slots.tabs.length + (hasFinalTab ? 1 : 0)

  // `foldedKey` is the identity of the set; `folded` is a fresh array every
  // render, so depending on it directly would loop. (No eslint-disable here:
  // this package's lint config doesn't register react-hooks/exhaustive-deps —
  // see the task report for why.)
  const foldedKey = folded.map((slot) => slot.value).join(',')
  useEffect(() => {
    setOverflowItems(folded)
  }, [foldedKey, setOverflowItems])

  // Every declared panel item, not just the folded ones — a panel that is a
  // tab or lives in a lone End slot never reaches `overflowItems`, but
  // `Navigator.Content` needs its content reachable by value all the same.
  // Same stable-key discipline as `foldedKey`: `panelSlots` is a fresh array
  // every render.
  const panelSlots = [...slots.tabs, ...folded].filter((slot) => slot.panel)
  const panelKey = panelSlots.map((slot) => slot.value).join(',')
  useEffect(() => {
    setPanelItems(panelSlots)
  }, [panelKey, setPanelItems])

  // Folded items with nowhere to render is silent otherwise — the shape of
  // mistake this branch has paid for repeatedly. In an effect, not the walk:
  // React 19 strict mode double-invokes render.
  const foldedWithNoHost = folded.length > 1 && !hasContent
  useEffect(() => {
    if (!isDev() || !foldedWithNoHost) return
    console.warn(
      '[Roadie] Navigator.Primary folded items into a More tab, but no ' +
        'Navigator.Content is mounted to host the overflow pane. The ' +
        'folded destinations are unreachable below `md`. Render a ' +
        'Navigator.Content, optionally with a Navigator.Overflow inside it.'
    )
  }, [foldedWithNoHost])

  // Tapping the active tab. Collapsed, the first tap only reopens the bar
  // (pinned so the still-scrolled pane can't re-collapse it). Expanded, it
  // depends on where you are: on the section's own landing it scrolls the pane
  // to the top; on a sub-page it pops up to the landing (the tab's href already
  // points there, so the link navigates itself). Inactive tabs navigate as
  // usual; disclosure tabs keep opening the overflow.
  const selectDestination = (
    event: MouseEvent,
    tab: NavigatorSlotMeta,
    active: boolean
  ) => {
    // Any destination tap dismisses an open overflow pane.
    setOverflowOpen(false)
    // A panel item owns a menu, not a page — and it's a tab, not a screen
    // pushed on top of one: tapping it toggles the panel pane rather than
    // navigating, and a second tap on the same tab closes it again.
    if (tab.panel) {
      event.preventDefault()
      setOpenPanel(openPanel === tab.value ? null : tab.value)
      return
    }
    // Any other destination clears an open panel — tapping a different tab
    // leaves the one you were on, exactly like switching any other tab.
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
    // On a sub-page: navigate up to the landing. The link's href is the
    // landing, so let it navigate; only a section with sub-pages but no
    // resolvable href needs the manual fallback.
    if (tab.href === undefined) {
      event.preventDefault()
      setValue(tab.topValue)
    }
  }

  return (
    <>
      <ScrollArea
        // A function render, not `<nav />`: `ScrollAreaRoot` hard-codes
        // `role: 'presentation'` on its own props, which would otherwise
        // stick to this landmark. See `NavigatorPane` for the same pattern.
        render={(renderProps) => <nav {...renderProps} role={undefined} />}
        data-slot='navigator-rail'
        data-form={form}
        aria-label={ariaLabel}
        className={cn(navigatorRailVariants({ form }), className)}
      >
        <ScrollArea.Viewport
          ref={railRef}
          data-slot='navigator-rail-viewport'
          className={navigatorRailViewportVariants()}
        >
          {/* Wrapped so the bar re-measures as sections expand and collapse —
              the viewport's own box never changes. */}
          <ScrollArea.Content
            fitWidth={false}
            className={navigatorRailContentVariants()}
          >
            {wrapRailRun(children)}
          </ScrollArea.Content>
          <NavigatorIndicator trackRef={railRef} surface='rail' />
        </ScrollArea.Viewport>
        {/* The rail is transparent and square — nothing for the bar to clear. */}
        <ScrollArea.Scrollbar flush>
          <ScrollArea.Thumb />
        </ScrollArea.Scrollbar>
      </ScrollArea>
      <nav
        data-slot='navigator-tab-bar'
        data-collapsed={String(collapsed)}
        data-hidden={String(navHidden)}
        aria-label={`${ariaLabel} tabs`}
        // The one piece of the bar's geometry the stylesheet can't derive.
        // See `navigatorTabBarVariants` for what reads it.
        style={{ '--navigator-tab-count': String(tabCount) } as CSSProperties}
        // A bar the design says is not there must not be tabbable or
        // announced. `inert` blocks focus and pointer interaction; the
        // `aria-hidden` pairing is what takes it out of the accessibility
        // tree everywhere, not only where `visibility: hidden` applies.
        inert={navHidden}
        aria-hidden={navHidden || undefined}
        className={navigatorTabBarVariants({ collapsed, hidden: navHidden })}
      >
        <div
          ref={tabTrackRef}
          data-slot='navigator-tab-bar-track'
          className={navigatorTabBarTrackVariants({ collapsed })}
        >
          <div
            aria-hidden
            data-slot='navigator-tab-bar-pill'
            className={navigatorTabBarPillVariants({ collapsed })}
          />
          <NavigatorIndicator
            trackRef={tabTrackRef}
            surface='tab'
            hidden={collapsed}
          />
          {slots.tabs.map((tab, tabIndex) => {
            // A panel tab reads active while its own panel is the open one —
            // it's a disclosure, not a destination, so `isSectionActive` (which
            // deliberately excludes a panel) never applies to it.
            const active = tab.panel
              ? openPanel === tab.value
              : isSectionActive(tab, activeValue)
            // While any disclosure is open — the overflow pane or a panel — it
            // is the selected tab; a route tab yields its pill and currency to
            // it so exactly one tab reads as active, then reclaims them on
            // close. A panel tab's own `active` already IS the disclosure, so
            // it never yields to itself.
            const visualActive = tab.panel ? active : active && !disclosureOpen
            const isLeftCircle = activeIsFinal
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

          {/* The final tab, which collapse always floats as the right circle —
              the left one being the active tab, or the first tab when the
              active tab IS this one. */}
          {slots.label !== undefined ? (
            <>
              {generatesPane ? (
                <NavigatorTab
                  label={slots.label}
                  icon={<ListIcon />}
                  active={overflowOpen || (foldedIsActive && !disclosureOpen)}
                  collapsed={collapsed}
                  circleSide='right'
                  index={slots.tabs.length}
                  expanded={overflowOpen}
                  controls={overflowOpen ? overflowPaneId : undefined}
                  onSelect={() => {
                    // Opening the overflow leaves any open panel behind —
                    // two disclosures can't both claim the top of the stack.
                    setOpenPanel(null)
                    setOverflowOpen(!overflowOpen)
                  }}
                />
              ) : (
                <NavigatorTab
                  label={slots.label}
                  icon={soleFolded?.icon}
                  href={soleFolded?.panel ? undefined : soleFolded?.href}
                  active={
                    soleFolded?.panel
                      ? openPanel === soleFolded.value
                      : foldedIsActive && !disclosureOpen
                  }
                  isPage={
                    soleFolded !== undefined &&
                    isActiveValue(soleFolded.value, activeValue)
                  }
                  collapsed={collapsed}
                  circleSide='right'
                  index={slots.tabs.length}
                  expanded={
                    soleFolded?.panel
                      ? openPanel === soleFolded.value
                      : undefined
                  }
                  onSelect={(event) =>
                    selectDestination(event, soleFolded!, foldedIsActive)
                  }
                />
              )}
            </>
          ) : null}
        </div>
      </nav>
    </>
  )
}

NavigatorPrimary.displayName = 'Navigator.Primary'
