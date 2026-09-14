'use client'

import {
  Children,
  type ComponentProps,
  isValidElement,
  use,
  useCallback,
  useEffect,
  useInsertionEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { isDev } from '../../utils/isDev'
import { mergeRefs } from '../../utils/mergeRefs'
import { PANE_CHROME_NONE } from '../Pane/PaneChromeContext'
import { PaneContext } from '../Pane/PaneContext'
import { PaneHeader } from '../Pane/PaneHeader'
import {
  type PaneRegistration,
  PaneStackContext,
  type PaneStackContextValue
} from '../Pane/PaneStackContext'
import { PaneTitle } from '../Pane/PaneTitle'
import { GeneratedOverflowContext } from './GeneratedOverflowContext'
import {
  NavigatorActionsContext,
  NavigatorDisclosureContext,
  NavigatorSelectionContext,
  isActiveValue
} from './NavigatorContext'
import { NavigatorOverflowItems } from './NavigatorOverflowItems'
import { NavigatorOverflowPane } from './NavigatorOverflowPane'
import { NavigatorSecondaryPane } from './NavigatorSecondaryPane'
import { NavigatorSectionPane } from './NavigatorSectionPane'
import { OVERFLOW_LABEL } from './mobileSlots'
import {
  derivePositions,
  deriveRootIndex,
  orderByDocumentPosition,
  provisionalPosition
} from './paneStack'
import { useTopPaneChrome } from './useTopPaneChrome'
import { navigatorContentVariants } from './variants'

export type NavigatorContentProps = ComponentProps<'main'>

type RegisteredPane = { id: string; node: HTMLElement } & PaneRegistration

/** Arranges panes and decides which is the top of the stack. */
export function NavigatorContent({
  className,
  children,
  ref: forwardedRef,
  ...props
}: NavigatorContentProps) {
  const { setPrimaryNav } = use(NavigatorActionsContext)
  const {
    value,
    activeSection,
    listPaneShows,
    declaredSecondaryPanes,
    showList
  } = use(NavigatorSelectionContext)
  const { overflowItems, overflowOpen } = use(NavigatorDisclosureContext)

  const contentRef = useRef<HTMLElement | null>(null)
  const ref = useMemo(() => mergeRefs(contentRef, forwardedRef), [forwardedRef])

  // More and a change of section are tab switches, not pushes: the stack flips
  // without sliding. An insertion effect runs before any layout effect can
  // flush styles mid-flip.
  const sectionValue = activeSection?.value ?? null
  const lastTab = useRef({ overflowOpen, sectionValue })
  useInsertionEffect(() => {
    const last = lastTab.current
    if (
      last.overflowOpen === overflowOpen &&
      last.sectionValue === sectionValue
    ) {
      return
    }
    lastTab.current = { overflowOpen, sectionValue }
    const node = contentRef.current
    if (!node) return
    node.setAttribute('data-instant', '')
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => node.removeAttribute('data-instant'))
    })
    return () => cancelAnimationFrame(frame)
  }, [overflowOpen, sectionValue])

  // The Map serves effects, which run before the snapshot re-renders; render
  // reads the snapshot.
  const panes = useRef(new Map<string, RegisteredPane>())
  const [registered, setRegistered] = useState<readonly RegisteredPane[]>([])

  const register = useCallback(
    (id: string, node: HTMLElement, entry: PaneRegistration) => {
      panes.current.set(id, { id, node, ...entry })
      setRegistered(Array.from(panes.current.values()))
    },
    []
  )

  const unregister = useCallback((id: string) => {
    panes.current.delete(id)
    setRegistered(Array.from(panes.current.values()))
  }, [])

  // More's `current` follows `overflowOpen` so it is top in the commit it
  // opens, not one later.
  const ordered = useMemo(
    () =>
      orderByDocumentPosition(registered).map((pane) =>
        pane.kind === 'overflow' || pane.kind === 'generated-overflow'
          ? { ...pane, current: overflowOpen }
          : pane
      ),
    [registered, overflowOpen]
  )
  const onSectionRoute =
    activeSection !== null && isActiveValue(activeSection.value, value)
  const revealing =
    listPaneShows && !overflowOpen && (onSectionRoute || showList)
  const positions = useMemo(
    () => derivePositions(ordered, revealing),
    [ordered, revealing]
  )
  const topIndex = positions.indexOf('top')
  const topId = topIndex === -1 ? null : (ordered[topIndex]?.id ?? null)
  const rootIndex = useMemo(() => deriveRootIndex(ordered), [ordered])

  // Unregistered, as on the server: a list pane is the root, top only while revealed.
  const atRoot =
    ordered.length === 0 ? revealing || !listPaneShows : topIndex === rootIndex
  const chrome = useTopPaneChrome({ atRoot })

  // Panes register through `register` and `unregister` alone, which stay
  // stable, so these lookups can change with the stack without looping.
  const positionOf = useCallback(
    (id: string, entry: PaneRegistration) => {
      const index = ordered.findIndex((pane) => pane.id === id)
      return index === -1
        ? provisionalPosition(entry, revealing)
        : (positions[index] ?? null)
    },
    [ordered, positions, revealing]
  )

  const chromeOf = useCallback(
    (id: string, entry: PaneRegistration) =>
      positionOf(id, entry) === 'top' ? chrome : PANE_CHROME_NONE,
    [chrome, positionOf]
  )

  const isRootOf = useCallback(
    (id: string) => {
      const index = ordered.findIndex((pane) => pane.id === id)
      return index !== -1 && index === rootIndex
    },
    [ordered, rootIndex]
  )

  const stackValue = useMemo<PaneStackContextValue>(
    () => ({ register, unregister, positionOf, chromeOf, isRootOf }),
    [register, unregister, positionOf, chromeOf, isRootOf]
  )

  // The children scans avoid a first-render flicker; registration finds a wrapped declaration.
  const declaredOverflow =
    Children.toArray(children).some(
      (child) => isValidElement(child) && child.type === NavigatorOverflowPane
    ) || ordered.some((pane) => pane.kind === 'overflow')
  const directOverrides = Children.toArray(children).flatMap((child) =>
    isValidElement<{ value: string }>(child) &&
    child.type === NavigatorSecondaryPane
      ? [child.props.value]
      : []
  )
  const overridden =
    activeSection !== null &&
    (declaredSecondaryPanes.has(activeSection.value) ||
      directOverrides.includes(activeSection.value))

  // Reads the ref, not `ordered`: child effects have registered by now, the render hadn't.
  const hasChildren = children != null && children !== false
  useEffect(() => {
    if (!isDev() || !hasChildren) return
    const declared = Array.from(panes.current.values()).some(
      (pane) =>
        pane.kind === 'pane' ||
        pane.kind === 'section' ||
        pane.kind === 'overflow'
    )
    if (declared) return
    console.warn(
      '[Roadie] Navigator.Content rendered children but identified no ' +
        'panes. Stack position, push/pop motion and primaryNav are all ' +
        'inert until a Pane registers. If your panes render inside a ' +
        'wrapper that suppresses effects, or you are rendering a Pane ' +
        'from a server component, that is the cause.'
    )
  }, [hasChildren, registered])

  const topPrimaryNav =
    ordered.find((pane) => pane.id === topId)?.primaryNav ?? 'auto'
  useEffect(() => {
    setPrimaryNav(topPrimaryNav)
  }, [topPrimaryNav, setPrimaryNav])

  const fallbackOverflow =
    !declaredOverflow &&
    overflowItems.horizontal.length + overflowItems.vertical.length > 0 ? (
      <GeneratedOverflowContext value key='__navigator-overflow'>
        <NavigatorOverflowPane>
          <PaneHeader>
            <PaneTitle>{OVERFLOW_LABEL}</PaneTitle>
          </PaneHeader>
          <NavigatorOverflowItems />
        </NavigatorOverflowPane>
      </GeneratedOverflowContext>
    ) : null

  // Keyed so the search resets with the section; More replaces it while open.
  const sectionPane =
    activeSection !== null && listPaneShows && !overflowOpen && !overridden ? (
      <NavigatorSectionPane key={activeSection.value} section={activeSection} />
    ) : null

  return (
    <main
      ref={ref}
      data-slot='navigator-content'
      className={cn(navigatorContentVariants(), className)}
      {...props}
    >
      <PaneStackContext value={stackValue}>
        {/* Resets to stack level so a nested Navigator registers its own panes. */}
        <PaneContext value={null}>
          {sectionPane}
          {children}
          {fallbackOverflow}
        </PaneContext>
      </PaneStackContext>
    </main>
  )
}

NavigatorContent.displayName = 'Navigator.Content'
