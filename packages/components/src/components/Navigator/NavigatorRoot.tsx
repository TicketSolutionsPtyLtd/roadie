'use client'

import {
  Children,
  type ReactElement,
  type ReactNode,
  isValidElement,
  useCallback,
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
  type NavigatorActiveSection,
  NavigatorContext,
  type NavigatorContextValue,
  type NavigatorOverflowSets
} from './NavigatorContext'
import {
  NavigatorPrimary,
  type NavigatorPrimaryProps,
  type NavigatorSlotMeta
} from './NavigatorPrimary'
import { findActiveSection } from './activeSection'
import { type SectionMemory, nextMemory } from './sectionMemory'
import { navigatorRootVariants } from './variants'

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
  expanded: expandedProp,
  defaultExpanded,
  onExpandedChange,
  expandedFromDocument = false,
  className,
  children
}: NavigatorRootProps) {
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
  const setExpanded = useCallback(
    (next: boolean) => {
      setDocumentExpanded((current) => current && false)
      if (expandedProp === undefined) setUncontrolledExpanded(next)
      onExpandedChange?.(next)
    },
    [expandedProp, onExpandedChange]
  )
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
  const primaryId = useId()
  const [navCollapsed, setNavCollapsed] = useState(false)
  const [primaryNav, setPrimaryNav] = useState<PanePrimaryNav>('auto')
  const [pinExpanded, setPinExpanded] = useState(false)
  const [publishedSection, setActiveSection] =
    useState<NavigatorActiveSection | null>(null)
  const [overflowOpen, setOverflowOpen] = useState(false)
  // A new destination from anywhere, Back included, leaves More.
  const [lastValue, setLastValue] = useState(value)
  if (lastValue !== value) {
    setLastValue(value)
    setOverflowOpen(false)
  }
  const [overflowItems, setOverflowItemsState] =
    useState<NavigatorOverflowSets>({ horizontal: [], vertical: [] })
  const setOverflowItems = useCallback(
    (surface: keyof NavigatorOverflowSets, next: NavigatorSlotMeta[]) =>
      setOverflowItemsState((current) => ({ ...current, [surface]: next })),
    []
  )
  const overflowOpener = useRef<HTMLElement | null>(null)
  const overflowPaneId = useId()
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [sectionMemory, setSectionMemory] = useState<SectionMemory>(
    () => new Map()
  )
  const rememberSection = useCallback((section: string, href: string) => {
    setSectionMemory((memory) => nextMemory(memory, section, href))
  }, [])
  const [declaredSecondaryPanes, setDeclaredSecondaryPanes] = useState<
    ReadonlySet<string>
  >(() => new Set())
  const declareSecondaryPane = useCallback((value: string) => {
    setDeclaredSecondaryPanes((current) => new Set(current).add(value))
    return () =>
      setDeclaredSecondaryPanes((current) => {
        const next = new Set(current)
        next.delete(value)
        return next
      })
  }, [])

  // A walk, not a child registration, which raced Primary's "no host" warning on first commit.
  const { hasContent, primary } = useMemo(() => {
    let hasContent = false
    let primary: ReactElement<NavigatorPrimaryProps> | undefined
    Children.forEach(children, (child) => {
      if (!isValidElement(child)) return
      if (child.type === NavigatorContent) hasContent = true
      if (child.type === NavigatorPrimary) {
        primary ??= child as ReactElement<NavigatorPrimaryProps>
      }
    })
    return { hasContent, primary }
  }, [children])

  // During render, not from Primary's effect, so the server renders the section's list pane.
  const derivedSection = useMemo(
    () =>
      primary === undefined
        ? undefined
        : findActiveSection(primary.props.children, value),
    [primary, value]
  )
  const activeSection =
    derivedSection === undefined ? publishedSection : derivedSection

  // Ref, not state: read imperatively on tap, never rendered.
  const activePaneScroller = useRef<(() => void) | null>(null)
  const setActivePaneScroller = useCallback((scroller: (() => void) | null) => {
    activePaneScroller.current = scroller
  }, [])
  const scrollActivePaneToTop = useCallback(() => {
    activePaneScroller.current?.()
  }, [])

  const contextValue = useMemo<NavigatorContextValue>(
    () => ({
      value,
      setValue: (next: string) => onValueChange?.(next),
      navCollapsed,
      setNavCollapsed,
      primaryNav,
      setPrimaryNav,
      pinExpanded,
      setPinExpanded,
      scrollActivePaneToTop,
      setActivePaneScroller,
      activeSection,
      setActiveSection,
      overflowOpen,
      setOverflowOpen,
      overflowPaneId,
      overflowItems,
      setOverflowItems,
      overflowOpener,
      hasContent,
      openMenu,
      setOpenMenu,
      sectionMemory,
      rememberSection,
      declaredSecondaryPanes,
      declareSecondaryPane,
      showList: showList ?? false,
      onShowListChange,
      expanded,
      setExpanded,
      expandedFromDocument,
      primaryId
    }),
    [
      value,
      onValueChange,
      navCollapsed,
      primaryNav,
      pinExpanded,
      scrollActivePaneToTop,
      setActivePaneScroller,
      activeSection,
      overflowOpen,
      overflowPaneId,
      overflowItems,
      setOverflowItems,
      hasContent,
      openMenu,
      sectionMemory,
      rememberSection,
      declaredSecondaryPanes,
      declareSecondaryPane,
      showList,
      onShowListChange,
      expanded,
      setExpanded,
      expandedFromDocument,
      primaryId
    ]
  )

  return (
    <NavigatorContext value={contextValue}>
      <div
        data-slot='navigator'
        className={cn(navigatorRootVariants(), className)}
      >
        {children}
      </div>
    </NavigatorContext>
  )
}

NavigatorRoot.displayName = 'Navigator.Root'
