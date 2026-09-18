'use client'

import {
  Children,
  type ReactElement,
  type ReactNode,
  isValidElement,
  use,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState
} from 'react'

import { NAVIGATOR_EXPANDED_ATTRIBUTE } from '@oztix/roadie-core/navigator'
import { cn } from '@oztix/roadie-core/utils'

import { scrollToTop } from '../../utils/reducedMotion'
import { useIsomorphicLayoutEffect } from '../../utils/useIsomorphicLayoutEffect'
import { PaneStackContext } from '../Pane/PaneStackContext'
import type { PaneTabBar } from '../Pane/variants'
import { NavigatorContent } from './NavigatorContent'
import {
  type NavigatorActions,
  NavigatorActionsContext,
  type NavigatorBar,
  NavigatorBarContext,
  type NavigatorDisclosure,
  NavigatorDisclosureContext,
  type NavigatorExpansion,
  NavigatorExpansionContext,
  type NavigatorOverflowSets,
  type NavigatorSelection,
  NavigatorSelectionContext,
  isActiveValue
} from './NavigatorContext'
import {
  NavigatorPrimary,
  type NavigatorPrimaryProps
} from './NavigatorPrimary'
import {
  findActiveSecondary,
  findItem,
  findMenuItem,
  findSecondaryByValue
} from './activeSecondary'
import { collectSlots } from './collectSlots'
import type { NavigatorSlotMeta } from './mobileSlots'
import { primarySignature } from './primarySignature'
import { useExpandMotion } from './useExpandMotion'
import { useFramePending } from './useFramePending'
import { navigatorRootClass } from './variants'

export type NavigatorRootProps = {
  /** The active destination's `value`; selection belongs to your router. */
  value?: string
  /** Called when a destination is activated; omit when hrefs drive selection. */
  onValueChange?: (next: string) => void
  /** Shows the active secondary's list over a stacked sub-page. Derive it from the URL, such as `?nav`. */
  showList?: boolean
  /** Called when the active destination's tab asks to show or hide the list. Without it, the tab links to the destination route. */
  onShowListChange?: (next: boolean) => void
  /** Opens the More pane. Derive it from the URL, such as `?more`. Without it, More keeps its own state. */
  showMore?: boolean
  /** Called when More asks to open or close. A tap that navigates closes it with the route instead. */
  onShowMoreChange?: (next: boolean) => void
  /** Shows labels beside the icons on large screens. Persist it yourself, such as in a cookie. */
  expanded?: boolean
  /** The uncontrolled starting state of `expanded`. @default false */
  defaultExpanded?: boolean
  /** Called when `Navigator.ExpandToggle` asks to expand or collapse. */
  onExpandedChange?: (next: boolean) => void
  /** Reads the state `getNavigatorExpandedScript` sets on `<html>` before hydration. For static sites. */
  expandedFromDocument?: boolean
  className?: string
  children?: ReactNode
}

export function NavigatorRoot({
  value,
  onValueChange,
  showList,
  onShowListChange,
  showMore,
  onShowMoreChange,
  expanded: expandedProp,
  defaultExpanded,
  onExpandedChange,
  expandedFromDocument = false,
  className,
  children
}: NavigatorRootProps) {
  // Handlers are read at call time, so the actions context never changes with them.
  const handlers = useRef({
    onValueChange,
    onExpandedChange,
    onShowListChange,
    onShowMoreChange
  })
  useIsomorphicLayoutEffect(() => {
    handlers.current = {
      onValueChange,
      onExpandedChange,
      onShowListChange,
      onShowMoreChange
    }
  })

  const [uncontrolledExpanded, setUncontrolledExpanded] = useState(
    defaultExpanded ?? false
  )
  // Unread until mount, so a server-rendered `false` never erases what the head script painted.
  const [documentExpanded, setDocumentExpanded] = useState<boolean>()
  const [lastExpandedProp, setLastExpandedProp] = useState(expandedProp)
  if (lastExpandedProp !== expandedProp) {
    setLastExpandedProp(expandedProp)
    if (documentExpanded) setDocumentExpanded(false)
  }
  const expanded =
    (expandedProp ?? uncontrolledExpanded) || documentExpanded === true
  const expandedControlled = expandedProp !== undefined
  const setExpanded = (next: boolean) => {
    setDocumentExpanded((current) => current && false)
    if (!expandedControlled) setUncontrolledExpanded(next)
    handlers.current.onExpandedChange?.(next)
  }
  useIsomorphicLayoutEffect(() => {
    if (!expandedFromDocument) return
    setDocumentExpanded(
      document.documentElement.hasAttribute(NAVIGATOR_EXPANDED_ATTRIBUTE)
    )
  }, [expandedFromDocument])
  useIsomorphicLayoutEffect(() => {
    if (!expandedFromDocument || documentExpanded === undefined) return
    const root = document.documentElement
    if (root.hasAttribute(NAVIGATOR_EXPANDED_ATTRIBUTE) !== expanded) {
      root.toggleAttribute(NAVIGATOR_EXPANDED_ATTRIBUTE, expanded)
    }
  }, [expanded, expandedFromDocument, documentExpanded])
  const expandedPending = expandedFromDocument && documentExpanded === undefined
  const rootRef = useRef<HTMLDivElement>(null)
  useExpandMotion(rootRef, expanded, expandedPending)
  const primaryId = useId()
  const [navCollapsed, setNavCollapsed] = useState(false)
  const [tabBar, setTabBar] = useState<PaneTabBar>('auto')
  const [pinExpanded, setPinExpanded] = useState(false)
  const latestPrimaryChildren = useRef<ReactNode>(null)
  const moreControlled = showMore !== undefined
  const [uncontrolledMore, setUncontrolledMore] = useState(false)
  // The app kept More open across a new destination; hidden until it answers.
  const [moreClosing, setMoreClosing] = useState(false)
  const overflowOpen = moreControlled
    ? showMore && !moreClosing
    : uncontrolledMore
  // A new destination from anywhere, Back included, leaves More, unless the same update opened it.
  const [seen, setSeen] = useState({ value, showMore })
  if (seen.value !== value || seen.showMore !== showMore) {
    setSeen({ value, showMore })
    if (seen.showMore !== showMore) setMoreClosing(false)
    else if (!moreControlled) setUncontrolledMore(false)
    else if (showMore) setMoreClosing(true)
  }
  useEffect(() => {
    if (moreClosing) handlers.current.onShowMoreChange?.(false)
  }, [moreClosing])
  // A nested Navigator sits inside a pane, so the frame around it is the one
  // that answers the tap.
  const pending = useFramePending(use(PaneStackContext) === null)
  const overflowOpenNow = useRef(overflowOpen)
  useIsomorphicLayoutEffect(() => {
    overflowOpenNow.current = overflowOpen
  })
  const setOverflowOpen = (next: boolean) => {
    setMoreClosing(false)
    if (!moreControlled) setUncontrolledMore(next)
    if (overflowOpenNow.current !== next) {
      handlers.current.onShowMoreChange?.(next)
    }
  }
  const closeOverflowOnRoute = () => {
    if (!moreControlled) setOverflowOpen(false)
  }
  const [overflowItems, setOverflowItemsState] =
    useState<NavigatorOverflowSets>({ horizontal: [], vertical: [] })
  const setOverflowItems = (
    surface: keyof NavigatorOverflowSets,
    next: NavigatorSlotMeta[]
  ) => setOverflowItemsState((current) => ({ ...current, [surface]: next }))
  const overflowOpenerRef = useRef<HTMLElement | null>(null)
  const overflowPaneId = useId()
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [declaredSecondaryPanes, setDeclaredSecondaryPanes] = useState<
    ReadonlySet<string>
  >(() => new Set())
  const declareSecondaryPane = (value: string) => {
    setDeclaredSecondaryPanes((current) => new Set(current).add(value))
    return () =>
      setDeclaredSecondaryPanes((current) => {
        const next = new Set(current)
        next.delete(value)
        return next
      })
  }

  // A walk, not a child registration, which raced Primary's "no host" warning on first commit.
  // Non-Primary children become an implicit `Navigator.Content` unless the
  // caller wrote one explicitly, which renders verbatim (props, position,
  // everything) as the escape hatch for `className` and other passthrough.
  const { hasExplicitContent, primary, rest } = useMemo(() => {
    const elements = Children.toArray(children).filter(isValidElement)
    const primary = elements.find(
      (child) => child.type === NavigatorPrimary
    ) as ReactElement<NavigatorPrimaryProps> | undefined
    return {
      hasExplicitContent: elements.some(
        (child) => child.type === NavigatorContent
      ),
      primary,
      rest: elements.filter((child) => child !== primary)
    }
  }, [children])
  const primaryDerived = primary !== undefined

  // Element identities change whenever a caller re-renders JSX, even when
  // its authored tree is equivalent. Keep the derived tree stable for that
  // case, but include object and function identities so current props and
  // handlers always replace their earlier values.
  const derivedChildren = primary?.props.children
  const derivedSignature = useMemo(
    () => primarySignature(derivedChildren),
    [derivedChildren]
  )
  const [derived, setDerived] = useState({
    signature: derivedSignature,
    children: derivedChildren
  })
  if (derived.signature !== derivedSignature) {
    setDerived({ signature: derivedSignature, children: derivedChildren })
  }
  // During render, not from Primary's effect, so the server renders the secondary's list pane.
  const primaryChildren =
    derived.signature === derivedSignature ? derived.children : derivedChildren
  const collected = useMemo(
    () => collectSlots(primaryChildren),
    [primaryChildren]
  )
  // The latest elements, not the structural copy, so handlers are current at click time.
  useIsomorphicLayoutEffect(() => {
    latestPrimaryChildren.current = derivedChildren
  }, [derivedChildren])

  // Keyed on which secondary is active, so moving between its rows keeps its identity.
  const activeSecondaryValue =
    findActiveSecondary(collected.ordered, value)?.value ?? null
  const activeSecondary = useMemo(
    () =>
      activeSecondaryValue === null
        ? null
        : findSecondaryByValue(collected.ordered, activeSecondaryValue),
    [collected, activeSecondaryValue]
  )

  const latestSlots = () => collectSlots(latestPrimaryChildren.current).ordered
  const activateItem = useCallback((itemValue: string) => {
    findItem(latestSlots(), itemValue)?.onSelect?.()
  }, [])
  const activateMenuItem = useCallback((itemValue: string, index: number) => {
    findMenuItem(latestSlots(), itemValue, index)?.onSelect?.()
  }, [])
  const listPaneShows =
    activeSecondary !== null &&
    !(activeSecondary.overview && isActiveValue(activeSecondary.value, value))

  // Read at tap time from what the stack published. The first row is this
  // Navigator's own; its level skips the panes of any Navigator nested in it.
  // A pane portalled out of the row isn't reached, but the stack can't lay it out either.
  const scrollActivePaneToTop = () => {
    const row = rootRef.current?.querySelector<HTMLElement>(
      '[data-slot="navigator-panes"]'
    )
    scrollToTop(
      row?.querySelector(
        `[data-stack][data-level="${row.dataset.level}"][data-stack-position="top"] [data-slot="pane-viewport"]`
      )
    )
  }

  const handlesShowList = onShowListChange !== undefined
  const actions: NavigatorActions = {
    setValue: (next) => handlers.current.onValueChange?.(next),
    setNavCollapsed,
    setTabBar,
    setPinExpanded,
    scrollActivePaneToTop,
    primaryDerived,
    activateItem,
    activateMenuItem,
    setOverflowOpen,
    closeOverflowOnRoute,
    overflowPaneId,
    setOverflowItems,
    overflowOpenerRef,
    setOpenMenu,
    declareSecondaryPane,
    onShowListChange: handlesShowList
      ? (next) => handlers.current.onShowListChange?.(next)
      : undefined,
    setExpanded,
    expandedFromDocument,
    primaryId
  }
  const selection: NavigatorSelection = {
    value,
    collected,
    activeSecondary,
    listPaneShows,
    showList: showList ?? false,
    declaredSecondaryPanes
  }
  const disclosure: NavigatorDisclosure = {
    overflowOpen,
    openMenu,
    overflowItems
  }
  const expansion: NavigatorExpansion = { expanded, expandedPending }
  const bar: NavigatorBar = { navCollapsed, tabBar, pinExpanded }

  return (
    <NavigatorActionsContext value={actions}>
      <NavigatorSelectionContext value={selection}>
        <NavigatorDisclosureContext value={disclosure}>
          <NavigatorExpansionContext value={expansion}>
            <NavigatorBarContext value={bar}>
              <div
                ref={rootRef}
                data-slot='navigator'
                data-pending={pending === 'idle' ? undefined : pending}
                className={cn(navigatorRootClass, className)}
              >
                {pending === 'idle' ? null : (
                  <div aria-hidden data-slot='navigator-pending' />
                )}
                {hasExplicitContent ? (
                  children
                ) : (
                  <>
                    {primary}
                    <NavigatorContent>
                      {rest.length > 0 ? rest : undefined}
                    </NavigatorContent>
                  </>
                )}
              </div>
            </NavigatorBarContext>
          </NavigatorExpansionContext>
        </NavigatorDisclosureContext>
      </NavigatorSelectionContext>
    </NavigatorActionsContext>
  )
}

NavigatorRoot.displayName = 'Navigator.Root'
