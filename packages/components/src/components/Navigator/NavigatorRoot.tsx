'use client'

import {
  Children,
  type ReactElement,
  type ReactNode,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState
} from 'react'

import { NAVIGATOR_EXPANDED_ATTRIBUTE } from '@oztix/roadie-core/navigator'
import { cn } from '@oztix/roadie-core/utils'

import { useIsomorphicLayoutEffect } from '../../utils/useIsomorphicLayoutEffect'
import type { PanePrimaryNav } from '../Pane/variants'
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
  findActiveSection,
  findItem,
  findMenuItem,
  findSectionByValue
} from './activeSection'
import type { NavigatorSlotMeta } from './mobileSlots'
import { primarySignature } from './primarySignature'
import { type SectionMemory, nextMemory } from './sectionMemory'
import { useExpandMotion } from './useExpandMotion'
import { navigatorRootClass } from './variants'

export type NavigatorRootProps = {
  /**
   * The active destination's `value`. Navigator is always controlled —
   * selection belongs to the app's router, not to Navigator.
   */
  value?: string
  /**
   * Called when a destination is activated. Omit when every item carries an
   * `href` and the router drives selection.
   */
  onValueChange?: (next: string) => void
  /** Puts the active section's list on top of a stacked layout; derive it from your URL, e.g. `?nav`. */
  showList?: boolean
  /** Called when the active section's tab asks to show or hide the list; omit it and the tab links to the section route. */
  onShowListChange?: (next: boolean) => void
  /** Opens the More pane; derive it from your URL, e.g. `?more`. Omit it and More keeps its own state. */
  showMore?: boolean
  /** Called when More asks to open or close. A routed choice closes it with the route instead. */
  onShowMoreChange?: (next: boolean) => void
  /**
   * The large-screen vertical navigation shows labels beside icons. Navigator
   * never touches storage — persist the choice yourself (a cookie reads on the
   * server without a flash) and pass it back.
   */
  expanded?: boolean
  /** The uncontrolled starting state of `expanded`. @default false */
  defaultExpanded?: boolean
  /** Called when `Navigator.ExpandToggle` asks to expand or collapse. */
  onExpandedChange?: (next: boolean) => void
  /** Follow `getNavigatorExpandedScript`'s attribute on `<html>` before hydration, for static sites. */
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
  const [primaryNav, setPrimaryNav] = useState<PanePrimaryNav>('auto')
  const [pinExpanded, setPinExpanded] = useState(false)
  const [published, setPublished] = useState<{
    signature: string
    children: ReactNode
  }>({ signature: '', children: null })
  const latestPrimaryChildren = useRef<ReactNode>(null)
  // A wrapper reading this context re-renders Primary with fresh elements; republishing them loops.
  const setPrimaryChildren = (next: ReactNode) => {
    latestPrimaryChildren.current = next
    const signature = primarySignature(next)
    setPublished((current) =>
      current.signature === signature ? current : { signature, children: next }
    )
  }
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
  // A routed choice: the route that follows closes a controlled More.
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
  const [sectionMemory, setSectionMemory] = useState<SectionMemory>(
    () => new Map()
  )
  const rememberSection = (section: string, href: string) => {
    setSectionMemory((memory) => nextMemory(memory, section, href))
  }
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
  const { hasContent, primary } = useMemo(() => {
    const elements = Children.toArray(children).filter(isValidElement)
    return {
      hasContent: elements.some((child) => child.type === NavigatorContent),
      primary: elements.find((child) => child.type === NavigatorPrimary) as
        ReactElement<NavigatorPrimaryProps> | undefined
    }
  }, [children])
  const primaryDerived = primary !== undefined

  // A parent re-render hands over new elements for the same tree; only a new
  // structure republishes, so nothing derived from them changes identity.
  const derivedChildren = primary?.props.children
  const derivedSignature = useMemo(
    () => (primaryDerived ? primarySignature(derivedChildren) : ''),
    [primaryDerived, derivedChildren]
  )
  const [derived, setDerived] = useState({
    signature: derivedSignature,
    children: derivedChildren
  })
  if (primaryDerived && derived.signature !== derivedSignature) {
    setDerived({ signature: derivedSignature, children: derivedChildren })
  }
  // During render, not from Primary's effect, so the server renders the section's list pane.
  const primaryChildren = !primaryDerived
    ? published.children
    : derived.signature === derivedSignature
      ? derived.children
      : derivedChildren
  // Keyed on which section is active, so moving between its rows keeps its identity.
  const activeSectionValue = useMemo(
    () => findActiveSection(primaryChildren, value)?.value ?? null,
    [primaryChildren, value]
  )
  const activeSection = useMemo(
    () =>
      activeSectionValue === null
        ? null
        : findSectionByValue(primaryChildren, activeSectionValue),
    [primaryChildren, activeSectionValue]
  )
  useIsomorphicLayoutEffect(() => {
    if (primaryDerived) latestPrimaryChildren.current = derivedChildren
  }, [primaryDerived, derivedChildren])
  const activateItem = useCallback((itemValue: string) => {
    findItem(latestPrimaryChildren.current, itemValue)?.onClick?.()
  }, [])
  const activateMenuItem = useCallback((itemValue: string, index: number) => {
    findMenuItem(latestPrimaryChildren.current, itemValue, index)?.onClick?.()
  }, [])
  const listPaneShows =
    activeSection !== null &&
    !(
      activeSection.root === 'page' && isActiveValue(activeSection.value, value)
    )

  // Ref, not state: read imperatively on tap, never rendered.
  const activePaneScrollers = useRef<(() => void)[]>([])
  // The latest one still held wins. Two panes can both be provisionally top
  // before registration; the one that steps down releases only its own.
  const registerActivePaneScroller = (scroller: () => void) => {
    activePaneScrollers.current.push(scroller)
    return () => {
      const held = activePaneScrollers.current
      const at = held.lastIndexOf(scroller)
      if (at !== -1) held.splice(at, 1)
    }
  }
  const scrollActivePaneToTop = () => {
    activePaneScrollers.current.at(-1)?.()
  }

  const handlesShowList = onShowListChange !== undefined
  const actions: NavigatorActions = {
    setValue: (next) => handlers.current.onValueChange?.(next),
    setNavCollapsed,
    setPrimaryNav,
    setPinExpanded,
    scrollActivePaneToTop,
    registerActivePaneScroller,
    setPrimaryChildren,
    primaryDerived,
    activateItem,
    activateMenuItem,
    setOverflowOpen,
    closeOverflowOnRoute,
    overflowPaneId,
    setOverflowItems,
    overflowOpenerRef,
    hasContent,
    setOpenMenu,
    rememberSection,
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
    primaryChildren,
    activeSection,
    listPaneShows,
    showList: showList ?? false,
    sectionMemory,
    declaredSecondaryPanes
  }
  const disclosure: NavigatorDisclosure = {
    overflowOpen,
    openMenu,
    overflowItems
  }
  const expansion: NavigatorExpansion = { expanded, expandedPending }
  const bar: NavigatorBar = { navCollapsed, primaryNav, pinExpanded }

  return (
    <NavigatorActionsContext value={actions}>
      <NavigatorSelectionContext value={selection}>
        <NavigatorDisclosureContext value={disclosure}>
          <NavigatorExpansionContext value={expansion}>
            <NavigatorBarContext value={bar}>
              <div
                ref={rootRef}
                data-slot='navigator'
                className={cn(navigatorRootClass, className)}
              >
                {children}
              </div>
            </NavigatorBarContext>
          </NavigatorExpansionContext>
        </NavigatorDisclosureContext>
      </NavigatorSelectionContext>
    </NavigatorActionsContext>
  )
}

NavigatorRoot.displayName = 'Navigator.Root'
