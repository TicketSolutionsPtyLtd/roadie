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
  NavigatorContext,
  type NavigatorContextValue,
  type NavigatorSecondaryNav
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
  className?: string
  children?: ReactNode
}

export function NavigatorRoot({
  value,
  onValueChange,
  className,
  children
}: NavigatorRootProps) {
  const [hasNesting, setHasNesting] = useState(false)
  const [navCollapsed, setNavCollapsed] = useState(false)
  const [primaryNav, setPrimaryNav] = useState<PanePrimaryNav>('auto')
  const [pinExpanded, setPinExpanded] = useState(false)
  const [secondaryNav, setSecondaryNav] =
    useState<NavigatorSecondaryNav | null>(null)
  const [overflowOpen, setOverflowOpen] = useState(false)
  const [overflowItems, setOverflowItems] = useState<NavigatorSlotMeta[]>([])
  const overflowPaneId = useId()
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [sectionMemory, setSectionMemory] = useState<SectionMemory>(
    () => new Map()
  )
  const rememberSection = useCallback((section: string, href: string) => {
    setSectionMemory((memory) => nextMemory(memory, section, href))
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
      hasNesting,
      setHasNesting,
      navCollapsed,
      setNavCollapsed,
      primaryNav,
      setPrimaryNav,
      pinExpanded,
      setPinExpanded,
      scrollActivePaneToTop,
      setActivePaneScroller,
      secondaryNav,
      setSecondaryNav,
      overflowOpen,
      setOverflowOpen,
      overflowPaneId,
      overflowItems,
      setOverflowItems,
      hasContent,
      openMenu,
      setOpenMenu,
      sectionMemory,
      rememberSection
    }),
    [
      value,
      onValueChange,
      hasNesting,
      navCollapsed,
      primaryNav,
      pinExpanded,
      scrollActivePaneToTop,
      setActivePaneScroller,
      secondaryNav,
      overflowOpen,
      overflowPaneId,
      overflowItems,
      hasContent,
      openMenu,
      sectionMemory,
      rememberSection
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
