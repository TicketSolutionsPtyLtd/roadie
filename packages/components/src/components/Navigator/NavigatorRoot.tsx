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
  const [openPanel, setOpenPanel] = useState<string | null>(null)
  const [panelItems, setPanelItems] = useState<NavigatorSlotMeta[]>([])
  const [sectionMemory, setSectionMemory] = useState<SectionMemory>(
    () => new Map()
  )
  const rememberSection = useCallback((section: string, href: string) => {
    setSectionMemory((memory) => nextMemory(memory, section, href))
  }, [])

  // Derived synchronously from Root's own children, not from a child-effect
  // registering itself: that raced against Navigator.Primary's "no host"
  // warning — on the very first commit Content's registration effect hadn't
  // landed yet, so even a valid mount warned once. Root's single render sees
  // both siblings already, so there is no second commit to race.
  //
  // Trade-off: a walk, unlike context, only sees direct children. A
  // Navigator.Content wrapped in Suspense, a layout div, or any helper
  // component is invisible here — `hasContent` reads false and the "no host"
  // warning fires even though Content is mounted and working via context.
  const hasContent = useMemo(() => {
    let found = false
    Children.forEach(children, (child) => {
      if (isValidElement(child) && child.type === NavigatorContent) {
        found = true
      }
    })
    return found
  }, [children])

  // Ref, not state: the visible pane overwrites its scroller every render and
  // the tab bar reads it imperatively on tap — no re-render needs to observe it.
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
      openPanel,
      setOpenPanel,
      panelItems,
      setPanelItems,
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
      openPanel,
      panelItems,
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
