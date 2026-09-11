'use client'

import {
  Children,
  type ReactNode,
  isValidElement,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState
} from 'react'

import { cn } from '@oztix/roadie-core/utils'

import type { PanePrimaryNav } from '../Pane/variants'
import { NavigatorContent } from './NavigatorContent'
import {
  type NavigatorActiveSection,
  NavigatorContext,
  type NavigatorContextValue,
  type NavigatorOverflowSets
} from './NavigatorContext'
import type { NavigatorSlotMeta } from './NavigatorPrimary'
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
  /**
   * Show the active section's list pane on top of a stacked layout, even
   * on a sub-page. Derive it from your URL (e.g. `?nav`) so "show me the
   * list" is linkable and Back-able. On the section route the list is on
   * top regardless. No effect once panes are columns (`lg`).
   */
  showList?: boolean
  /**
   * Called with `true` when the active section's tab is tapped on a
   * sub-page, and `false` when it's tapped again while the list is
   * showing. Turn it into a URL update. Omit it and that tap navigates to
   * the section route instead.
   */
  onShowListChange?: (next: boolean) => void
  className?: string
  children?: ReactNode
}

export function NavigatorRoot({
  value,
  onValueChange,
  showList,
  onShowListChange,
  className,
  children
}: NavigatorRootProps) {
  const [navCollapsed, setNavCollapsed] = useState(false)
  const [primaryNav, setPrimaryNav] = useState<PanePrimaryNav>('auto')
  const [pinExpanded, setPinExpanded] = useState(false)
  const [activeSection, setActiveSection] =
    useState<NavigatorActiveSection | null>(null)
  const [overflowOpen, setOverflowOpen] = useState(false)
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
  const [stackAtRoot, setStackAtRoot] = useState(true)
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
  const hasContent = useMemo(() => {
    let found = false
    Children.forEach(children, (child) => {
      if (isValidElement(child) && child.type === NavigatorContent) {
        found = true
      }
    })
    return found
  }, [children])

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
      stackAtRoot,
      setStackAtRoot
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
      stackAtRoot
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
